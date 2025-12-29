import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTables } from '../database/schema.js';
import { setDatabase } from '../database/connection.js';
import { operationsRouter } from '../routes/operations.js';
import { projectsRouter } from '../routes/projects.js';

describe('Operations API', () => {
  let app: express.Express;
  let db: Database.Database;
  let testProjectId: string;

  beforeAll(() => {
    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    createTables(db);
    setDatabase(db);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectsRouter);
    app.use('/api', operationsRouter);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(async () => {
    // Clean up database
    db.exec('DELETE FROM operations');
    db.exec('DELETE FROM projects');

    // Create a test project
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project', description: 'For testing' });

    testProjectId = response.body.data.id;
  });

  describe('GET /api/projects/:projectId/operations', () => {
    it('should list operations for project', async () => {
      // Create some operations
      await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Op 1', description: 'First op', type: 'API_CALL' });

      await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Op 2', description: 'Second op', type: 'USER_INTERACTION' });

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/operations`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array for project with no operations', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/operations`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should filter by status', async () => {
      await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Op 1', type: 'API_CALL' });

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/operations?status=MANUAL`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should filter by type', async () => {
      await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Op 1', type: 'API_CALL' });

      await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Op 2', type: 'USER_INTERACTION' });

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/operations?type=API_CALL`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('API_CALL');
    });
  });

  describe('GET /api/operations/:id', () => {
    it('should get a single operation', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Test Op', description: 'A test', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/operations/${opId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Op');
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .get('/api/operations/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/projects/:projectId/operations', () => {
    it('should create a manual operation', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({
          name: 'New Operation',
          description: 'A new operation',
          type: 'USER_INTERACTION',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Operation');
      expect(response.body.data.status).toBe('MANUAL');
      expect(response.body.data.confidence).toBe(1);
    });

    it('should require name', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ type: 'API_CALL' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require valid type', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Test', type: 'INVALID_TYPE' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/non-existent/operations')
        .send({ name: 'Test', type: 'API_CALL' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/operations/:id', () => {
    it('should update operation name', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Original', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/operations/${opId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should update operation status', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Test Op', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/operations/${opId}`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('should update multiple fields', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'Original', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/operations/${opId}`)
        .send({
          name: 'Updated',
          description: 'New description',
          type: 'DATA_FLOW',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated');
      expect(response.body.data.description).toBe('New description');
      expect(response.body.data.type).toBe('DATA_FLOW');
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .patch('/api/operations/non-existent')
        .send({ name: 'Update' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/operations/:id', () => {
    it('should delete operation', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'To Delete', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/operations/${opId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/operations/${opId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .delete('/api/operations/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/operations/:id/confirm', () => {
    it('should confirm an operation', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'To Confirm', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/operations/${opId}/confirm`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .post('/api/operations/non-existent/confirm');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/operations/:id/reject', () => {
    it('should reject an operation', async () => {
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/operations`)
        .send({ name: 'To Reject', type: 'API_CALL' });

      const opId = createResponse.body.data.id;

      const response = await request(app)
        .post(`/api/operations/${opId}/reject`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('REJECTED');
    });

    it('should return 404 for non-existent operation', async () => {
      const response = await request(app)
        .post('/api/operations/non-existent/reject');

      expect(response.status).toBe(404);
    });
  });
});
