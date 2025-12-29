import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { documentsRouter } from '../routes/documents.js';
import { projectsRouter } from '../routes/projects.js';
import { setDatabase } from '../database/connection.js';
import { createTables } from '../database/schema.js';

describe('Documents API', () => {
  let app: express.Application;
  let db: Database.Database;
  let testProjectId: string;
  let testFolderPath: string;

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
    app.use('/api/documents', documentsRouter);

    // Create a test folder with some files
    testFolderPath = path.join(os.tmpdir(), 'veo-test-folder');
    if (!fs.existsSync(testFolderPath)) {
      fs.mkdirSync(testFolderPath, { recursive: true });
    }
    fs.writeFileSync(path.join(testFolderPath, 'test1.txt'), 'Test content 1');
    fs.writeFileSync(path.join(testFolderPath, 'test2.md'), '# Test Markdown');
    fs.writeFileSync(path.join(testFolderPath, 'test3.json'), '{"key": "value"}');

    // Create a subfolder with files
    const subFolder = path.join(testFolderPath, 'subfolder');
    if (!fs.existsSync(subFolder)) {
      fs.mkdirSync(subFolder, { recursive: true });
    }
    fs.writeFileSync(path.join(subFolder, 'nested.ts'), 'const x = 1;');
  });

  afterAll(() => {
    db.close();
    setDatabase(null);

    // Clean up test folder
    if (fs.existsSync(testFolderPath)) {
      fs.rmSync(testFolderPath, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Clean up documents for fresh test
    db.prepare('DELETE FROM documents').run();
    db.prepare('DELETE FROM projects').run();

    // Create a test project
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project', description: 'For document tests' });

    testProjectId = response.body.data.id;
  });

  describe('Single Document Upload', () => {
    it('should upload a single text file', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}`)
        .attach('file', Buffer.from('Hello World'), {
          filename: 'hello.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toBe('hello.txt');
      expect(response.body.data.content).toBe('Hello World');
      expect(response.body.data.sourceType).toBe('UPLOAD');
      expect(response.body.data.hash).toBeDefined();
    });

    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 404 if project does not exist', async () => {
      const response = await request(app)
        .post('/api/documents/project/non-existent-project')
        .attach('file', Buffer.from('Test'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Batch Document Upload', () => {
    it('should upload multiple files at once', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}/batch`)
        .attach('files', Buffer.from('File 1 content'), {
          filename: 'file1.txt',
          contentType: 'text/plain',
        })
        .attach('files', Buffer.from('File 2 content'), {
          filename: 'file2.txt',
          contentType: 'text/plain',
        })
        .attach('files', Buffer.from('File 3 content'), {
          filename: 'file3.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalFiles).toBe(3);
      expect(response.body.data.importedFiles).toBe(3);
      expect(response.body.data.documents).toHaveLength(3);
      expect(response.body.data.documents[0].sourceType).toBe('UPLOAD');
    });

    it('should return 400 if no files are uploaded', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}/batch`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No files uploaded');
    });
  });

  describe('Folder Import', () => {
    it('should import files from a local folder', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}/from-folders`)
        .send({
          folders: [
            {
              path: testFolderPath,
              name: 'Test Folder',
              recursive: true,
            },
          ],
          fileTypes: ['.txt', '.md', '.json', '.ts'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalFiles).toBe(4);
      expect(response.body.data.importedFiles).toBe(4);
      expect(response.body.data.documents).toHaveLength(4);

      // Check source tracking
      const doc = response.body.data.documents[0];
      expect(doc.sourceType).toBe('FOLDER');
      expect(doc.sourceName).toBe('Test Folder');
      expect(doc.sourcePath).toBe(testFolderPath);
    });

    it('should respect non-recursive option', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}/from-folders`)
        .send({
          folders: [
            {
              path: testFolderPath,
              recursive: false,
            },
          ],
          fileTypes: ['.txt', '.md', '.json', '.ts'],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.totalFiles).toBe(3); // Only root files, not subfolder
      expect(response.body.data.importedFiles).toBe(3);
    });

    it('should import from multiple folders', async () => {
      // Create a second test folder
      const secondFolder = path.join(os.tmpdir(), 'veo-test-folder-2');
      if (!fs.existsSync(secondFolder)) {
        fs.mkdirSync(secondFolder, { recursive: true });
      }
      fs.writeFileSync(path.join(secondFolder, 'extra.txt'), 'Extra content');

      try {
        const response = await request(app)
          .post(`/api/documents/project/${testProjectId}/from-folders`)
          .send({
            folders: [
              { path: testFolderPath, name: 'Folder 1', recursive: false },
              { path: secondFolder, name: 'Folder 2' },
            ],
            fileTypes: ['.txt', '.md', '.json'],
          });

        expect(response.status).toBe(201);
        expect(response.body.data.importedFiles).toBe(4); // 3 from folder1 + 1 from folder2

        // Verify different source names
        const sourceNames = new Set(response.body.data.documents.map((d: { sourceName: string }) => d.sourceName));
        expect(sourceNames.has('Folder 1')).toBe(true);
        expect(sourceNames.has('Folder 2')).toBe(true);
      } finally {
        fs.rmSync(secondFolder, { recursive: true, force: true });
      }
    });

    it('should return error for non-existent folder', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}/from-folders`)
        .send({
          folders: [
            { path: '/non/existent/folder' },
          ],
        });

      expect(response.status).toBe(201); // Still 201, but with errors
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].error).toBe('Folder does not exist');
    });

    it('should return 400 if no folders specified', async () => {
      const response = await request(app)
        .post(`/api/documents/project/${testProjectId}/from-folders`)
        .send({ folders: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No folders specified');
    });
  });

  describe('Document Retrieval', () => {
    it('should list all documents for a project', async () => {
      // Upload some documents first
      await request(app)
        .post(`/api/documents/project/${testProjectId}`)
        .attach('file', Buffer.from('Content 1'), {
          filename: 'doc1.txt',
          contentType: 'text/plain',
        });

      await request(app)
        .post(`/api/documents/project/${testProjectId}`)
        .attach('file', Buffer.from('Content 2'), {
          filename: 'doc2.txt',
          contentType: 'text/plain',
        });

      const response = await request(app)
        .get(`/api/documents/project/${testProjectId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should get a single document by ID', async () => {
      const uploadResponse = await request(app)
        .post(`/api/documents/project/${testProjectId}`)
        .attach('file', Buffer.from('Test content'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      const docId = uploadResponse.body.data.id;

      const response = await request(app)
        .get(`/api/documents/${docId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(docId);
      expect(response.body.data.filename).toBe('test.txt');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(app)
        .get('/api/documents/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Document Deletion', () => {
    it('should delete a single document', async () => {
      const uploadResponse = await request(app)
        .post(`/api/documents/project/${testProjectId}`)
        .attach('file', Buffer.from('To be deleted'), {
          filename: 'delete-me.txt',
          contentType: 'text/plain',
        });

      const docId = uploadResponse.body.data.id;

      const deleteResponse = await request(app)
        .delete(`/api/documents/${docId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/documents/${docId}`);

      expect(getResponse.status).toBe(404);
    });

    it('should delete all documents from a source', async () => {
      // Import from folder
      await request(app)
        .post(`/api/documents/project/${testProjectId}/from-folders`)
        .send({
          folders: [{ path: testFolderPath, name: 'ToDelete' }],
          fileTypes: ['.txt', '.md', '.json', '.ts'],
        });

      // Verify documents exist
      let listResponse = await request(app)
        .get(`/api/documents/project/${testProjectId}`);

      expect(listResponse.body.data.length).toBeGreaterThan(0);

      // Delete by source name
      const deleteResponse = await request(app)
        .delete(`/api/documents/project/${testProjectId}/source/ToDelete`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify all deleted
      listResponse = await request(app)
        .get(`/api/documents/project/${testProjectId}`);

      expect(listResponse.body.data).toHaveLength(0);
    });
  });
});
