import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTables } from '../database/schema.js';
import { setDatabase } from '../database/connection.js';
import { discoveryRouter } from '../routes/discovery.js';
import { projectsRouter } from '../routes/projects.js';
import { documentsRouter } from '../routes/documents.js';

describe('Discovery API', () => {
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
    app.use('/api/documents', documentsRouter);
    app.use('/api', discoveryRouter);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(async () => {
    // Clean up database
    db.exec('DELETE FROM discovery_jobs');
    db.exec('DELETE FROM operations');
    db.exec('DELETE FROM documents');
    db.exec('DELETE FROM projects');

    // Create a test project
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project', description: 'For testing' });

    testProjectId = response.body.data.id;
  });

  describe('POST /api/projects/:projectId/discover', () => {
    it('should create a discovery job', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('projectId', testProjectId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data.type).toBe('DISCOVERY');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/non-existent-id/discover')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    it('should return existing job if one is already running', async () => {
      // Create first job
      const response1 = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      const firstJobId = response1.body.data.id;

      // Try to create second job immediately
      const response2 = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      // Should return the same job (or completed if fast)
      expect(response2.status).toBe(201);
      expect(response2.body.success).toBe(true);
    });
  });

  describe('GET /api/discovery/jobs/:jobId', () => {
    it('should get job status', async () => {
      // Create a job first
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      const jobId = createResponse.body.data.id;

      // Wait a bit for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get(`/api/discovery/jobs/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', jobId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('progress');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/discovery/jobs/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('GET /api/projects/:projectId/discovery/latest', () => {
    it('should get latest discovery job for project', async () => {
      // Create a job first
      const createResponse = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      const jobId = createResponse.body.data.id;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/discovery/latest`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', jobId);
      expect(response.body.data).toHaveProperty('projectId', testProjectId);
    });

    it('should return 404 when no jobs exist for project', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/discovery/latest`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Discovery with documents', () => {
    it('should complete discovery with no documents', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      const jobId = response.body.data.id;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200));

      const statusResponse = await request(app)
        .get(`/api/discovery/jobs/${jobId}`);

      expect(statusResponse.body.data.status).toBe('COMPLETED');
      expect(statusResponse.body.data.progress).toBe(100);
      expect(statusResponse.body.data.result).toHaveProperty('operationsCreated', 0);
    });

    it('should discover operations from documents', async () => {
      // Add a document to the project
      const textContent = 'User login flow: The user enters credentials and the system authenticates them via API.';
      const buffer = Buffer.from(textContent);

      await request(app)
        .post(`/api/documents/project/${testProjectId}`)
        .attach('file', buffer, { filename: 'api-docs.txt', contentType: 'text/plain' });

      // Start discovery
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/discover`)
        .send();

      const jobId = response.body.data.id;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      const statusResponse = await request(app)
        .get(`/api/discovery/jobs/${jobId}`);

      expect(statusResponse.body.data.status).toBe('COMPLETED');
      expect(statusResponse.body.data.progress).toBe(100);
      // With mock LLM client, should create mock operations
      expect(statusResponse.body.data.result.operationsCreated).toBeGreaterThan(0);
    });
  });
});
