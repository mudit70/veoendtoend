import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { diagramsRouter } from '../routes/diagrams';
import { DiagramService } from '../services/diagramService';

// Mock the database
vi.mock('../database', () => ({
  db: {
    getOperationById: vi.fn((id: string) => {
      if (id === 'op-1') {
        return {
          id: 'op-1',
          projectId: 'project-1',
          name: 'Test Operation',
          description: 'Test description',
          type: 'API_CALL',
          status: 'CONFIRMED',
          confidence: 0.9,
          sourceDocumentIds: ['doc-1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }),
    getDocumentsByProjectId: vi.fn(() => [
      {
        id: 'doc-1',
        projectId: 'project-1',
        filename: 'test.txt',
        content: 'User clicks button, frontend React code calls POST /api/endpoint. Backend service queries database.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  },
}));

const app = express();
app.use(express.json());
app.use('/api', diagramsRouter);

describe('Diagram Export API', () => {
  describe('POST /api/diagrams/:id/export', () => {
    it('should export diagram as JSON', async () => {
      // Create a diagram first
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/export`)
        .send({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('diagram');
      expect(response.body.data).toHaveProperty('components');
      expect(response.body.data).toHaveProperty('edges');
      expect(response.body.data).toHaveProperty('exportedAt');
    });

    it('should default to JSON format when not specified', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/export`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('diagram');
    });

    it('should include all 11 components in export', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/export`)
        .send({ format: 'json' });

      expect(response.body.data.components.length).toBe(11);
    });

    it('should include edges in export', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/export`)
        .send({ format: 'json' });

      expect(response.body.data.edges.length).toBeGreaterThan(0);
    });

    it('should return 400 for unsupported format', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/export`)
        .send({ format: 'svg' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Only JSON export');
    });

    it('should return 404 for non-existent diagram', async () => {
      const response = await request(app)
        .post('/api/diagrams/non-existent/export')
        .send({ format: 'json' });

      expect(response.status).toBe(404);
    });
  });
});

describe('DiagramService Export', () => {
  let service: DiagramService;

  beforeEach(() => {
    service = new DiagramService();
  });

  it('should export diagram with correct structure', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const exportData = service.exportDiagram(job.diagramId, 'json') as {
      diagram: {
        id: string;
        name: string;
        operationId: string;
        status: string;
      };
      components: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        status: string;
        confidence: number;
        position: { x: number; y: number };
        isUserModified: boolean;
      }>;
      edges: Array<{
        id: string;
        source: string;
        target: string;
        type: string;
        label?: string;
      }>;
      exportedAt: string;
    };

    expect(exportData).not.toBeNull();
    expect(exportData.diagram.id).toBe(job.diagramId);
    expect(exportData.diagram.status).toBe('COMPLETED');
  });

  it('should include component positions in export', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const exportData = service.exportDiagram(job.diagramId, 'json') as {
      components: Array<{ position: { x: number; y: number } }>;
    };

    for (const component of exportData.components) {
      expect(component.position).toHaveProperty('x');
      expect(component.position).toHaveProperty('y');
    }
  });

  it('should include edge source and target in export', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const exportData = service.exportDiagram(job.diagramId, 'json') as {
      edges: Array<{ source: string; target: string; type: string }>;
    };

    for (const edge of exportData.edges) {
      expect(edge.source).toBeTruthy();
      expect(edge.target).toBeTruthy();
      expect(['REQUEST', 'RESPONSE']).toContain(edge.type);
    }
  });

  it('should include timestamp in export', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const exportData = service.exportDiagram(job.diagramId, 'json') as {
      exportedAt: string;
    };

    expect(exportData.exportedAt).toBeTruthy();
    // Should be a valid ISO date string
    expect(() => new Date(exportData.exportedAt)).not.toThrow();
  });

  it('should return null for non-existent diagram', () => {
    const exportData = service.exportDiagram('non-existent', 'json');
    expect(exportData).toBeNull();
  });

  it('should preserve user modifications in export', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Modify a component
    const diagram = service.getDiagram(job.diagramId);
    const componentId = diagram!.components[0].id;
    service.updateComponent(job.diagramId, componentId, {
      title: 'Modified Title',
    });

    const exportData = service.exportDiagram(job.diagramId, 'json') as {
      components: Array<{ id: string; title: string; isUserModified: boolean }>;
    };

    const modifiedComponent = exportData.components.find(c => c.id === componentId);
    expect(modifiedComponent!.title).toBe('Modified Title');
    expect(modifiedComponent!.isUserModified).toBe(true);
  });
});
