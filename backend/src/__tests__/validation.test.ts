import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { getDatabase } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Validation API', () => {
  let projectId: string;
  let operationId: string;
  let diagramId: string;

  beforeAll(async () => {
    // Wait for database initialization
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    const db = getDatabase();

    // Create a project
    projectId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, 'Test Project', 'Test Description', now, now);

    // Create an operation
    operationId = uuidv4();
    db.prepare(`
      INSERT INTO operations (id, project_id, name, description, type, status, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(operationId, projectId, 'Test Operation', 'Test Description', 'API_CALL', 'CONFIRMED', 0.9, now, now);

    // Create a diagram
    diagramId = uuidv4();
    db.prepare(`
      INSERT INTO diagrams (id, operation_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(diagramId, operationId, 'Test Diagram', 'COMPLETED', now, now);

    // Create some diagram components
    for (let i = 0; i < 3; i++) {
      const componentId = uuidv4();
      db.prepare(`
        INSERT INTO diagram_components (id, diagram_id, component_type, title, description, status, confidence, position_x, position_y, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(componentId, diagramId, 'API_ENDPOINT', `Component ${i + 1}`, `Description ${i + 1}`, 'POPULATED', 0.85, i * 100, 100, now, now);
    }
  });

  afterAll(async () => {
    const db = getDatabase();
    db.prepare('DELETE FROM validation_results').run();
    db.prepare('DELETE FROM validation_runs').run();
    db.prepare('DELETE FROM diagram_components').run();
    db.prepare('DELETE FROM diagram_edges').run();
    db.prepare('DELETE FROM diagrams').run();
    db.prepare('DELETE FROM operations').run();
    db.prepare('DELETE FROM projects').run();
  });

  describe('POST /api/diagrams/:id/validate', () => {
    it('should start validation', async () => {
      const response = await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(202);

      expect(response.body).toHaveProperty('id');
      expect(response.body.diagramId).toBe(diagramId);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.totalComponents).toBe(3);
      expect(response.body.validatedComponents).toBe(0);
    });

    it('should return 404 for non-existent diagram', async () => {
      const response = await request(app)
        .post('/api/diagrams/non-existent-id/validate')
        .expect(404);

      expect(response.body.error).toBe('Diagram not found');
    });

    it('should prevent duplicate validation runs', async () => {
      // Start first validation
      const first = await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(202);

      // Try to start another immediately
      const second = await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(409);

      expect(second.body.error).toBe('Validation already in progress');
      expect(second.body.validationId).toBe(first.body.id);
    });
  });

  describe('GET /api/validations/:id/status', () => {
    it('should return validation status', async () => {
      // Start validation
      const startResponse = await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(202);

      const validationId = startResponse.body.id;

      // Get status
      const statusResponse = await request(app)
        .get(`/api/validations/${validationId}/status`)
        .expect(200);

      expect(statusResponse.body.id).toBe(validationId);
      expect(statusResponse.body.diagramId).toBe(diagramId);
      expect(['PENDING', 'RUNNING', 'COMPLETED']).toContain(statusResponse.body.status);
      expect(statusResponse.body).toHaveProperty('progress');
      expect(statusResponse.body).toHaveProperty('totalComponents');
      expect(statusResponse.body).toHaveProperty('validatedComponents');
    });

    it('should return 404 for non-existent validation', async () => {
      const response = await request(app)
        .get('/api/validations/non-existent-id/status')
        .expect(404);

      expect(response.body.error).toBe('Validation run not found');
    });
  });

  describe('GET /api/validations/:id', () => {
    it('should return full validation report', async () => {
      // Start validation and wait for completion
      const startResponse = await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(202);

      const validationId = startResponse.body.id;

      // Wait for validation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get full report
      const reportResponse = await request(app)
        .get(`/api/validations/${validationId}`)
        .expect(200);

      expect(reportResponse.body.id).toBe(validationId);
      expect(reportResponse.body.diagramId).toBe(diagramId);
      expect(reportResponse.body).toHaveProperty('results');
      expect(reportResponse.body).toHaveProperty('summary');
      expect(Array.isArray(reportResponse.body.results)).toBe(true);
    });

    it('should include component details in results', async () => {
      // Start validation and wait for completion
      const startResponse = await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(202);

      const validationId = startResponse.body.id;

      // Wait for validation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get full report
      const reportResponse = await request(app)
        .get(`/api/validations/${validationId}`)
        .expect(200);

      if (reportResponse.body.results.length > 0) {
        const result = reportResponse.body.results[0];
        expect(result).toHaveProperty('componentId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('discrepancies');
        expect(result).toHaveProperty('confidence');
      }
    });

    it('should return 404 for non-existent validation', async () => {
      const response = await request(app)
        .get('/api/validations/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Validation run not found');
    });
  });

  describe('GET /api/diagrams/:id/validations', () => {
    it('should return validation history', async () => {
      // Run a validation first
      await request(app)
        .post(`/api/diagrams/${diagramId}/validate`)
        .expect(202);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get history
      const response = await request(app)
        .get(`/api/diagrams/${diagramId}/validations`)
        .expect(200);

      expect(response.body).toHaveProperty('validations');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.validations)).toBe(true);
      expect(response.body.validations.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/diagrams/${diagramId}/validations?limit=5&offset=0`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should return 404 for non-existent diagram', async () => {
      const response = await request(app)
        .get('/api/diagrams/non-existent-id/validations')
        .expect(404);

      expect(response.body.error).toBe('Diagram not found');
    });

    it('should return empty array for diagram with no validations', async () => {
      // Create a new diagram without validations
      const db = getDatabase();
      const newDiagramId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO diagrams (id, operation_id, name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newDiagramId, operationId, 'New Diagram', 'COMPLETED', now, now);

      const response = await request(app)
        .get(`/api/diagrams/${newDiagramId}/validations`)
        .expect(200);

      expect(response.body.validations).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });
  });
});
