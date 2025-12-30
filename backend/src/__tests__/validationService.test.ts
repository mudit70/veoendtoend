import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ValidationService, type ValidationComponent, type ValidationContext } from '../services/validationService';
import { getDatabase } from '../database/connection';
import { initializeDatabase } from '../database/init';
import { v4 as uuidv4 } from 'uuid';

// Mock the LLM client
vi.mock('../services/llmClient', () => ({
  llmClient: {
    complete: vi.fn().mockResolvedValue(JSON.stringify({
      isValid: true,
      confidence: 0.9,
      discrepancies: [],
      reasoning: 'Component matches source document'
    }))
  }
}));

describe('ValidationService', () => {
  let validationService: ValidationService;
  let projectId: string;
  let operationId: string;
  let diagramId: string;
  let documentId: string;
  let componentId: string;

  beforeAll(async () => {
    // Initialize database with full schema
    await initializeDatabase();
  });

  beforeEach(async () => {
    validationService = new ValidationService();
    const db = getDatabase();
    const now = new Date().toISOString();

    // Create test data
    projectId = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, 'Test Project', 'Description', now, now);

    documentId = uuidv4();
    db.prepare(`
      INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(documentId, projectId, 'test.txt', 'text/plain', 'Extracted text about API endpoints', 'hash123', 100, now, now);

    operationId = uuidv4();
    db.prepare(`
      INSERT INTO operations (id, project_id, name, description, type, status, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(operationId, projectId, 'Test Op', 'Description', 'API_CALL', 'CONFIRMED', 0.9, now, now);

    diagramId = uuidv4();
    db.prepare(`
      INSERT INTO diagrams (id, operation_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(diagramId, operationId, 'Test Diagram', 'COMPLETED', now, now);

    componentId = uuidv4();
    db.prepare(`
      INSERT INTO diagram_components (id, diagram_id, component_type, title, description, status, confidence, source_document_id, source_excerpt, position_x, position_y, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(componentId, diagramId, 'API_ENDPOINT', 'Test Endpoint', 'Test description', 'POPULATED', 0.85, documentId, 'Source excerpt', 0, 0, now, now);
  });

  afterAll(async () => {
    const db = getDatabase();
    db.prepare('DELETE FROM validation_results').run();
    db.prepare('DELETE FROM validation_runs').run();
    db.prepare('DELETE FROM diagram_components').run();
    db.prepare('DELETE FROM diagrams').run();
    db.prepare('DELETE FROM operations').run();
    db.prepare('DELETE FROM documents').run();
    db.prepare('DELETE FROM projects').run();
  });

  describe('createValidationRun', () => {
    it('should create a validation run', async () => {
      const validationId = await validationService.createValidationRun(diagramId);

      expect(validationId).toBeDefined();
      expect(typeof validationId).toBe('string');

      const db = getDatabase();
      const run = db.prepare('SELECT * FROM validation_runs WHERE id = ?').get(validationId) as { status: string };
      expect(run).toBeDefined();
      expect(run.status).toBe('PENDING');
    });

    it('should count components correctly', async () => {
      const validationId = await validationService.createValidationRun(diagramId);

      const db = getDatabase();
      const run = db.prepare('SELECT total_components FROM validation_runs WHERE id = ?').get(validationId) as { total_components: number };
      expect(run.total_components).toBe(1);
    });
  });

  describe('validateDiagram', () => {
    it('should validate all components', async () => {
      const validationId = await validationService.createValidationRun(diagramId);
      const results = await validationService.validateDiagram(validationId, diagramId);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
    });

    it('should update validation run status to COMPLETED', async () => {
      const validationId = await validationService.createValidationRun(diagramId);
      await validationService.validateDiagram(validationId, diagramId);

      const db = getDatabase();
      const run = db.prepare('SELECT status FROM validation_runs WHERE id = ?').get(validationId) as { status: string };
      expect(run.status).toBe('COMPLETED');
    });

    it('should calculate and store final score', async () => {
      const validationId = await validationService.createValidationRun(diagramId);
      await validationService.validateDiagram(validationId, diagramId);

      const db = getDatabase();
      const run = db.prepare('SELECT score FROM validation_runs WHERE id = ?').get(validationId) as { score: number };
      expect(run.score).toBeGreaterThanOrEqual(0);
      expect(run.score).toBeLessThanOrEqual(100);
    });
  });

  describe('validateComponent', () => {
    it('should validate a component with source document', async () => {
      const validationId = await validationService.createValidationRun(diagramId);
      const component: ValidationComponent = {
        id: componentId,
        title: 'Test Endpoint',
        description: 'Test description',
        componentType: 'API_ENDPOINT',
        sourceDocumentId: documentId,
        sourceExcerpt: 'Source excerpt',
        status: 'POPULATED',
        updatedAt: new Date().toISOString(),
      };

      const result = await validationService.validateComponent(validationId, component);

      expect(result.componentId).toBe(componentId);
      expect(result.status).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should mark component as UNVERIFIABLE when no source document', async () => {
      const validationId = await validationService.createValidationRun(diagramId);
      const component: ValidationComponent = {
        id: componentId,
        title: 'Test Endpoint',
        description: 'Test description',
        componentType: 'API_ENDPOINT',
        sourceDocumentId: null,
        sourceExcerpt: null,
        status: 'POPULATED',
        updatedAt: new Date().toISOString(),
      };

      const result = await validationService.validateComponent(validationId, component);

      expect(result.status).toBe('UNVERIFIABLE');
      expect(result.confidence).toBe(0.3);
    });
  });

  describe('detectStaleness', () => {
    it('should detect stale documents', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'Test',
          description: null,
          componentType: 'API_ENDPOINT',
          sourceDocumentId: documentId,
          sourceExcerpt: null,
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: 'Test content',
        documentUpdatedAt: oldDate.toISOString(),
      };

      const isStale = validationService.detectStaleness(context);
      expect(isStale).toBe(true);
    });

    it('should not flag recent documents as stale', () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 1); // 1 hour ago

      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'Test',
          description: null,
          componentType: 'API_ENDPOINT',
          sourceDocumentId: documentId,
          sourceExcerpt: null,
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: 'Test content',
        documentUpdatedAt: recentDate.toISOString(),
      };

      const isStale = validationService.detectStaleness(context);
      expect(isStale).toBe(false);
    });

    it('should return false when no document date', () => {
      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'Test',
          description: null,
          componentType: 'API_ENDPOINT',
          sourceDocumentId: null,
          sourceExcerpt: null,
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: null,
        documentUpdatedAt: null,
      };

      const isStale = validationService.detectStaleness(context);
      expect(isStale).toBe(false);
    });
  });

  describe('buildValidationPrompt', () => {
    it('should build a prompt with component and document info', () => {
      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'API Endpoint',
          description: 'Handles user requests',
          componentType: 'API_ENDPOINT',
          sourceDocumentId: documentId,
          sourceExcerpt: 'Users can call this API',
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: 'This is the API documentation',
        documentUpdatedAt: new Date().toISOString(),
      };

      const prompt = validationService.buildValidationPrompt(context);

      expect(prompt).toContain('API Endpoint');
      expect(prompt).toContain('Handles user requests');
      expect(prompt).toContain('API_ENDPOINT');
      expect(prompt).toContain('This is the API documentation');
    });

    it('should handle missing content gracefully', () => {
      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'Test',
          description: null,
          componentType: 'API_ENDPOINT',
          sourceDocumentId: null,
          sourceExcerpt: null,
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: null,
        documentUpdatedAt: null,
      };

      const prompt = validationService.buildValidationPrompt(context);

      expect(prompt).toContain('No description provided');
      expect(prompt).toContain('No excerpt available');
      expect(prompt).toContain('No source document available');
    });
  });

  describe('parseValidationResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        isValid: false,
        confidence: 0.8,
        discrepancies: [
          {
            type: 'CONTENT_MISMATCH',
            message: 'Title does not match',
            expectedValue: 'Expected',
            actualValue: 'Actual'
          }
        ]
      });

      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'Test',
          description: null,
          componentType: 'API_ENDPOINT',
          sourceDocumentId: documentId,
          sourceExcerpt: null,
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: 'Content',
        documentUpdatedAt: new Date().toISOString(),
      };

      const result = validationService.parseValidationResponse(response, context);

      expect(result.confidence).toBe(0.8);
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('CONTENT_MISMATCH');
    });

    it('should handle invalid JSON gracefully', () => {
      const response = 'This is not JSON';
      const context: ValidationContext = {
        component: {
          id: componentId,
          title: 'Test',
          description: null,
          componentType: 'API_ENDPOINT',
          sourceDocumentId: null,
          sourceExcerpt: null,
          status: 'POPULATED',
          updatedAt: new Date().toISOString(),
        },
        documentContent: null,
        documentUpdatedAt: null,
      };

      const result = validationService.parseValidationResponse(response, context);

      expect(result.confidence).toBe(0.7);
      expect(result.discrepancies).toHaveLength(0);
    });
  });

  describe('getValidationResults', () => {
    it('should retrieve validation results', async () => {
      const validationId = await validationService.createValidationRun(diagramId);
      await validationService.validateDiagram(validationId, diagramId);

      const results = validationService.getValidationResults(validationId);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].validationRunId).toBe(validationId);
    });
  });
});
