import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { healthRouter } from '../routes/health.js';
import { setDatabase } from '../database/connection.js';

describe('Health API', () => {
  let app: express.Application;
  let db: Database.Database;

  beforeAll(() => {
    // Set up test database
    db = new Database(':memory:');
    setDatabase(db);

    // Set up express app
    app = express();
    app.use('/api/health', healthRouter);
  });

  afterAll(() => {
    db.close();
    setDatabase(null);
  });

  it('should respond to health check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.timestamp).toBeDefined();
    expect(response.body.data.uptime).toBeDefined();
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
  });

  it('should check database connection', async () => {
    const response = await request(app).get('/api/health/db');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('connected');
    expect(response.body.data.test).toBe(true);
  });
});
