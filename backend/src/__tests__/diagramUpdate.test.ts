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

describe('Diagram Update API', () => {
  describe('PUT /api/diagrams/:id', () => {
    it('should update diagram name', async () => {
      // Create a diagram first
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .put(`/api/diagrams/${diagramId}`)
        .send({ name: 'Updated Diagram Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Diagram Name');
    });

    it('should update viewport state', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const viewportState = { x: 100, y: 200, zoom: 1.5 };
      const response = await request(app)
        .put(`/api/diagrams/${diagramId}`)
        .send({ viewportState });

      expect(response.status).toBe(200);
      expect(response.body.data.viewportState).toEqual(viewportState);
    });

    it('should return 404 for non-existent diagram', async () => {
      const response = await request(app)
        .put('/api/diagrams/non-existent')
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/diagrams/:id/components/:componentId', () => {
    it('should update component title', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      // Get the diagram to find a component ID
      const diagramResponse = await request(app).get(`/api/diagrams/${diagramId}`);
      const componentId = diagramResponse.body.data.components[0].id;

      const response = await request(app)
        .patch(`/api/diagrams/${diagramId}/components/${componentId}`)
        .send({ title: 'Custom Component Title' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Custom Component Title');
    });

    it('should update component description', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagramResponse = await request(app).get(`/api/diagrams/${diagramId}`);
      const componentId = diagramResponse.body.data.components[0].id;

      const response = await request(app)
        .patch(`/api/diagrams/${diagramId}/components/${componentId}`)
        .send({ description: 'Custom description for component' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Custom description for component');
    });

    it('should mark component as user modified', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagramResponse = await request(app).get(`/api/diagrams/${diagramId}`);
      const componentId = diagramResponse.body.data.components[0].id;

      const response = await request(app)
        .patch(`/api/diagrams/${diagramId}/components/${componentId}`)
        .send({ title: 'Modified Title' });

      expect(response.body.data.status).toBe('USER_MODIFIED');
      expect(response.body.data.isUserModified).toBe(true);
    });

    it('should return 404 for non-existent component', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .patch(`/api/diagrams/${diagramId}/components/non-existent`)
        .send({ title: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/diagrams/:id/components/:componentId/reset', () => {
    it('should reset component to original values', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagramResponse = await request(app).get(`/api/diagrams/${diagramId}`);
      const component = diagramResponse.body.data.components[0];
      const componentId = component.id;
      const originalTitle = component.title;

      // First modify the component
      await request(app)
        .patch(`/api/diagrams/${diagramId}/components/${componentId}`)
        .send({ title: 'Modified Title' });

      // Then reset it
      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/components/${componentId}/reset`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(originalTitle);
      expect(response.body.data.isUserModified).toBe(false);
    });

    it('should return 404 for non-existent component', async () => {
      const createResponse = await request(app)
        .post('/api/projects/project-1/operations/op-1/diagrams')
        .send();

      const diagramId = createResponse.body.data.diagramId;
      await new Promise(resolve => setTimeout(resolve, 800));

      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/components/non-existent/reset`)
        .send();

      expect(response.status).toBe(404);
    });
  });
});

describe('DiagramService Update Methods', () => {
  let service: DiagramService;

  beforeEach(() => {
    service = new DiagramService();
  });

  it('should track modification status', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    const component = diagram!.components[0];

    // Initial state should not be user modified
    expect(component.isUserModified).toBe(false);

    // Update component
    const updated = service.updateComponent(job.diagramId, component.id, {
      title: 'New Title',
    });

    expect(updated!.isUserModified).toBe(true);
    expect(updated!.status).toBe('USER_MODIFIED');
  });

  it('should preserve original values on update', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    const component = diagram!.components[0];
    const originalTitle = component.title;
    const originalDescription = component.description;

    // Update component
    service.updateComponent(job.diagramId, component.id, {
      title: 'New Title',
      description: 'New Description',
    });

    // Check that originals are stored
    const updatedDiagram = service.getDiagram(job.diagramId);
    const updatedComponent = updatedDiagram!.components.find(c => c.id === component.id);

    expect(updatedComponent!.originalTitle).toBe(originalTitle);
    expect(updatedComponent!.originalDescription).toBe(originalDescription);
  });

  it('should restore original values on reset', async () => {
    const job = await service.startDiagramGeneration('op-1');
    await new Promise(resolve => setTimeout(resolve, 800));

    const diagram = service.getDiagram(job.diagramId);
    const component = diagram!.components[0];
    const originalTitle = component.title;

    // Update then reset
    service.updateComponent(job.diagramId, component.id, { title: 'Modified' });
    const reset = service.resetComponent(job.diagramId, component.id);

    expect(reset!.title).toBe(originalTitle);
    expect(reset!.originalTitle).toBeUndefined();
    expect(reset!.isUserModified).toBe(false);
  });
});
