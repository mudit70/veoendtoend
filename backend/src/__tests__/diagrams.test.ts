import { describe, it, expect, beforeEach, vi } from 'vitest';
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
        content: 'Test content about API endpoint and database',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  },
}));

const app = express();
app.use(express.json());
app.use('/api', diagramsRouter);

describe('Diagram API', () => {
  describe('POST /api/projects/:projectId/operations/:operationId/diagrams', () => {
    it('should start diagram generation for an operation', async () => {
      const response = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('diagramId');
      expect(response.body.data.type).toBe('DIAGRAM_GENERATION');
      // Status may be PENDING or RUNNING since async processing starts immediately
      expect(['PENDING', 'RUNNING']).toContain(response.body.data.status);
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .post('/api/projects/project-1/operations/non-existent/diagrams')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Operation not found');
    });
  });

  describe('GET /api/diagram-jobs/:jobId', () => {
    it('should get job status', async () => {
      // First start a generation
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const jobId = createResponse.body.data.id;

      const response = await request(app).get(`/api/diagram-jobs/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(jobId);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).get('/api/diagram-jobs/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/diagrams/:id', () => {
    it('should get diagram with components and edges', async () => {
      // Start generation and wait for completion
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;

      // Wait for generation to complete
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app).get(`/api/diagrams/${diagramId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('components');
      expect(response.body.data).toHaveProperty('edges');
      expect(response.body.data.components.length).toBe(11);
      expect(response.body.data.edges.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent diagram', async () => {
      const response = await request(app).get('/api/diagrams/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:projectId/operations/:operationId/diagrams', () => {
    it('should list diagrams for an operation', async () => {
      // Create a diagram first
      await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const response = await request(app).get(
        '/api/projects/project-1/operations/op-1/diagrams'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array for operation with no diagrams', async () => {
      const response = await request(app).get(
        '/api/projects/project-1/operations/op-no-diagrams/diagrams'
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });
});

describe('DiagramService', () => {
  let service: DiagramService;

  beforeEach(() => {
    service = new DiagramService();
  });

  it('should create diagram for operation', async () => {
    const job = await service.startDiagramGeneration('op-1');

    expect(job).toHaveProperty('id');
    expect(job).toHaveProperty('diagramId');
    expect(job.type).toBe('DIAGRAM_GENERATION');
  });

  it('should generate all template components', async () => {
    const job = await service.startDiagramGeneration('op-1');

    // Wait for generation
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    expect(diagram).not.toBeNull();
    expect(diagram!.components.length).toBe(11);
  });

  it('should mark components as greyed out when no data found', async () => {
    const job = await service.startDiagramGeneration('op-1');

    // Wait for generation
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    expect(diagram).not.toBeNull();

    // Components should be either populated or greyed out based on keyword detection
    const greyedOut = diagram!.components.filter(c => c.status === 'GREYED_OUT');
    const populated = diagram!.components.filter(c => c.status === 'POPULATED');

    // Some components should be populated based on keyword matches
    expect(populated.length).toBeGreaterThan(0);
    // All components should have a status
    expect(populated.length + greyedOut.length).toBe(11);
  });

  it('should create edges between components', async () => {
    const job = await service.startDiagramGeneration('op-1');

    // Wait for generation
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    expect(diagram).not.toBeNull();
    expect(diagram!.edges.length).toBeGreaterThan(0);

    // Check edge structure
    const edge = diagram!.edges[0];
    expect(edge).toHaveProperty('sourceComponentId');
    expect(edge).toHaveProperty('targetComponentId');
    expect(edge).toHaveProperty('edgeType');
  });

  it('should update component and mark as user modified', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    const component = diagram!.components[0];

    const updated = service.updateComponent(job.diagramId, component.id, {
      title: 'Updated Title',
      description: 'Updated description',
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated Title');
    expect(updated!.description).toBe('Updated description');
    expect(updated!.status).toBe('USER_MODIFIED');
    expect(updated!.isUserModified).toBe(true);
  });

  it('should reset component to original', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    const component = diagram!.components[0];
    const originalTitle = component.title;

    // Update first
    service.updateComponent(job.diagramId, component.id, {
      title: 'Modified Title',
    });

    // Then reset
    const reset = service.resetComponent(job.diagramId, component.id);

    expect(reset).not.toBeNull();
    expect(reset!.title).toBe(originalTitle);
    expect(reset!.isUserModified).toBe(false);
  });

  it('should export diagram as JSON', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const exportData = service.exportDiagram(job.diagramId, 'json') as {
      diagram: unknown;
      components: unknown[];
      edges: unknown[];
      exportedAt: string;
    };

    expect(exportData).not.toBeNull();
    expect(exportData).toHaveProperty('diagram');
    expect(exportData).toHaveProperty('components');
    expect(exportData).toHaveProperty('edges');
    expect(exportData).toHaveProperty('exportedAt');
    expect(exportData.components.length).toBe(11);
  });
});
