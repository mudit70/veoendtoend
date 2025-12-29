import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { projectsRouter } from '../routes/projects.js';
import { setDatabase } from '../database/connection.js';
import { createTables } from '../database/schema.js';

describe('Projects API', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    // Set up test database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    createTables(db);
    setDatabase(db);

    // Set up express app
    app = express();
    app.use(express.json());
    app.use('/api/projects', projectsRouter);
  });

  afterAll(() => {
    db.close();
    setDatabase(null);
  });

  beforeEach(() => {
    // Clean up projects table before each test
    db.prepare('DELETE FROM projects').run();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project', description: 'A test project' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Project');
      expect(response.body.data.description).toBe('A test project');
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should create a project without description', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'No Description Project' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('No Description Project');
      expect(response.body.data.description).toBeNull();
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ description: 'Missing name' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 if name is empty', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: '   ', description: 'Empty name' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      // Create some projects
      await request(app).post('/api/projects').send({ name: 'Project 1' });
      await request(app).post('/api/projects').send({ name: 'Project 2' });
      await request(app).post('/api/projects').send({ name: 'Project 3' });

      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should return empty array when no projects exist', async () => {
      const response = await request(app).get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return projects in descending order by creation date', async () => {
      await request(app).post('/api/projects').send({ name: 'First' });
      await request(app).post('/api/projects').send({ name: 'Second' });
      await request(app).post('/api/projects').send({ name: 'Third' });

      const response = await request(app).get('/api/projects');

      expect(response.body.data[0].name).toBe('Third');
      expect(response.body.data[2].name).toBe('First');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get a single project', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Get Test', description: 'Testing get' });

      const projectId = createResponse.body.data.id;

      const response = await request(app).get(`/api/projects/${projectId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data.name).toBe('Get Test');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/projects/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Original Name', description: 'Original description' });

      const projectId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ name: 'Updated Name', description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update only the name', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Original', description: 'Keep this' });

      const projectId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('New Name');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .put('/api/projects/non-existent-id')
        .send({ name: 'Update Test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if name is missing', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Test' });

      const projectId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({ description: 'No name provided' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Delete Me' });

      const projectId = createResponse.body.data.id;

      const deleteResponse = await request(app).delete(`/api/projects/${projectId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Project deleted successfully');

      // Verify it's gone
      const getResponse = await request(app).get(`/api/projects/${projectId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).delete('/api/projects/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should cascade delete associated documents', async () => {
      // Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .send({ name: 'Project with Docs' });

      const projectId = createResponse.body.data.id;

      // Insert a document directly into DB
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, source_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOAD', ?, ?)
      `).run('doc-1', projectId, 'test.txt', 'text/plain', 'content', 'hash', 7, now, now);

      // Verify document exists
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get('doc-1');
      expect(doc).toBeDefined();

      // Delete the project
      await request(app).delete(`/api/projects/${projectId}`);

      // Verify document is also deleted (cascade)
      const deletedDoc = db.prepare('SELECT * FROM documents WHERE id = ?').get('doc-1');
      expect(deletedDoc).toBeUndefined();
    });
  });
});
