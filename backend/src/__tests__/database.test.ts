import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { createTables } from '../database/schema.js';

describe('Database', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
  });

  afterAll(() => {
    db.close();
  });

  it('should initialize all tables', () => {
    createTables(db);

    // Check that all tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('documents');
    expect(tableNames).toContain('document_versions');
    expect(tableNames).toContain('operations');
    expect(tableNames).toContain('diagrams');
    expect(tableNames).toContain('diagram_components');
    expect(tableNames).toContain('diagram_edges');
    expect(tableNames).toContain('validation_runs');
    expect(tableNames).toContain('validation_results');
    expect(tableNames).toContain('discovery_jobs');
  });

  it('should run migrations successfully', () => {
    // Tables should already be created from previous test
    // Running createTables again should not throw (idempotent)
    expect(() => createTables(db)).not.toThrow();
  });

  it('should enforce foreign key constraints', () => {
    // Try to insert a document without a valid project_id
    const stmt = db.prepare(`
      INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    expect(() =>
      stmt.run('doc-1', 'invalid-project', 'test.txt', 'text/plain', 'content', 'hash', 7, new Date().toISOString(), new Date().toISOString())
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  it('should allow valid insertions', () => {
    const now = new Date().toISOString();

    // Insert a project
    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('project-1', 'Test Project', 'Description', now, now);

    // Insert a document
    db.prepare(`
      INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('doc-1', 'project-1', 'test.txt', 'text/plain', 'content', 'hash', 7, now, now);

    // Verify the insertions
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get('project-1');
    expect(project).toBeDefined();

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get('doc-1');
    expect(document).toBeDefined();
  });

  it('should cascade delete documents when project is deleted', () => {
    // Delete the project
    db.prepare('DELETE FROM projects WHERE id = ?').run('project-1');

    // Document should also be deleted
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get('doc-1');
    expect(document).toBeUndefined();
  });
});
