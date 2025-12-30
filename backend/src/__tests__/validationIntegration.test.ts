import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { setDatabase, closeDatabase } from '../database/connection';
import { createTables } from '../database/schema';
import { ValidationService, validationService } from '../services/validationService';
import { DiscrepancyDetector, discrepancyDetector } from '../services/discrepancyDetector';
import { ScoringService, scoringService } from '../services/scoringService';
import {
  calculateValidationScore,
  determineValidationStatus,
  createValidationSummary,
  type ValidationResult,
} from '../models/validation';

// Mock LLM client
vi.mock('../services/llmClient', () => ({
  llmClient: {
    complete: vi.fn().mockResolvedValue(JSON.stringify({
      isValid: true,
      confidence: 0.9,
      discrepancies: [],
      reasoning: 'Content matches source document',
    })),
  },
}));

describe('Validation Integration Tests', () => {
  let db: Database.Database;
  let projectId: string;
  let diagramId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    setDatabase(db);
    createTables(db);

    projectId = uuidv4();
    diagramId = uuidv4();
    const operationId = uuidv4();
    const now = new Date().toISOString();

    // Create test project
    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, 'Integration Test Project', 'For integration testing', now, now);

    // Create test operation
    db.prepare(`
      INSERT INTO operations (id, project_id, name, description, type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(operationId, projectId, 'Test Operation', 'Test', 'USER_INTERACTION', 'CONFIRMED', now, now);

    // Create test diagram
    db.prepare(`
      INSERT INTO diagrams (id, operation_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(diagramId, operationId, 'Test Diagram', 'COMPLETED', now, now);

    // Create test components
    const componentIds = [uuidv4(), uuidv4(), uuidv4()];
    db.prepare(`
      INSERT INTO diagram_components (id, diagram_id, title, description, component_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(componentIds[0], diagramId, 'User Login', 'Handles user authentication', 'USER_ACTION', 'POPULATED', now, now);

    db.prepare(`
      INSERT INTO diagram_components (id, diagram_id, title, description, component_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(componentIds[1], diagramId, 'API Gateway', 'Routes API requests', 'API_GATEWAY', 'POPULATED', now, now);

    db.prepare(`
      INSERT INTO diagram_components (id, diagram_id, title, description, component_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(componentIds[2], diagramId, 'Database', null, 'DATABASE', 'POPULATED', now, now);
  });

  afterEach(() => {
    closeDatabase();
    vi.clearAllMocks();
  });

  describe('Full Validation Workflow', () => {
    it('should create and complete a validation run', async () => {
      const service = new ValidationService();

      // Create validation run
      const validationId = await service.createValidationRun(diagramId);
      expect(validationId).toBeDefined();

      // Run validation
      const results = await service.validateDiagram(validationId, diagramId);
      expect(results.length).toBe(3);

      // Check validation run status
      const run = db.prepare('SELECT * FROM validation_runs WHERE id = ?').get(validationId) as {
        status: string;
        score: number;
      };
      expect(run.status).toBe('COMPLETED');
      expect(run.score).toBeGreaterThanOrEqual(0);
    });

    it('should detect missing description as discrepancy', async () => {
      const detector = new DiscrepancyDetector();

      const component = {
        id: 'comp-1',
        title: 'Database',
        description: null,
        componentType: 'DATABASE',
        sourceExcerpt: null,
      };

      const discrepancies = detector.detectMissingData(component, []);

      expect(discrepancies.length).toBeGreaterThan(0);
      expect(discrepancies.some(d => d.type === 'MISSING_DATA')).toBe(true);
      expect(discrepancies.some(d => d.message.includes('description'))).toBe(true);
    });

    it('should integrate discrepancy detection with validation', async () => {
      const detector = new DiscrepancyDetector();

      const component = {
        id: 'comp-1',
        title: 'User Login',
        description: 'Handles login',
        componentType: 'USER_ACTION',
        sourceExcerpt: 'User authentication via OAuth',
      };

      const documents = [
        {
          id: 'doc-1',
          content: 'The system uses basic password authentication.',
          filename: 'auth.md',
        },
      ];

      const discrepancies = detector.detectDiscrepancies(component, documents);

      // Should detect content mismatch
      expect(discrepancies.some(d => d.type === 'CONTENT_MISMATCH')).toBe(true);
    });

    it('should generate scoring report with recommendations', () => {
      const service = new ScoringService();

      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run-1',
          componentId: 'comp-1',
          status: 'VALID',
          discrepancies: [],
          confidence: 0.95,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'r2',
          validationRunId: 'run-1',
          componentId: 'comp-2',
          status: 'WARNING',
          discrepancies: [
            { type: 'MISSING_DATA', severity: 'medium', message: 'Missing description' },
          ],
          confidence: 0.85,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'r3',
          validationRunId: 'run-1',
          componentId: 'comp-3',
          status: 'INVALID',
          discrepancies: [
            { type: 'CONFLICTING_SOURCES', severity: 'critical', message: 'Conflict found' },
          ],
          confidence: 0.90,
          createdAt: new Date().toISOString(),
        },
      ];

      const report = service.generateScoringReport(results);

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.healthStatus).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.summary.totalComponents).toBe(3);
    });
  });

  describe('Validation Model Functions', () => {
    it('should calculate validation score correctly', () => {
      const results: ValidationResult[] = [
        { id: 'r1', validationRunId: 'run', componentId: 'c1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r2', validationRunId: 'run', componentId: 'c2', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r3', validationRunId: 'run', componentId: 'c3', status: 'WARNING', discrepancies: [], confidence: 1, createdAt: '' },
      ];

      const score = calculateValidationScore(results);

      // 2 VALID (1.0) + 1 WARNING (0.7) = 2.7, divided by 3 = 0.9 = 90%
      expect(score).toBeCloseTo(90, 0);
    });

    it('should determine validation status from discrepancies', () => {
      const criticalDiscrepancies = [
        { type: 'CONFLICTING_SOURCES' as const, severity: 'critical' as const, message: 'Conflict' },
      ];

      const highDiscrepancies = [
        { type: 'CONTENT_MISMATCH' as const, severity: 'high' as const, message: 'Mismatch' },
      ];

      const mediumDiscrepancies = [
        { type: 'MISSING_DATA' as const, severity: 'medium' as const, message: 'Missing' },
      ];

      expect(determineValidationStatus(criticalDiscrepancies)).toBe('INVALID');
      expect(determineValidationStatus(highDiscrepancies)).toBe('WARNING');
      expect(determineValidationStatus(mediumDiscrepancies)).toBe('WARNING');
      expect(determineValidationStatus([])).toBe('VALID');
    });

    it('should create validation summary', () => {
      const results: ValidationResult[] = [
        { id: 'r1', validationRunId: 'run', componentId: 'c1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r2', validationRunId: 'run', componentId: 'c2', status: 'WARNING', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r3', validationRunId: 'run', componentId: 'c3', status: 'INVALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r4', validationRunId: 'run', componentId: 'c4', status: 'STALE', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r5', validationRunId: 'run', componentId: 'c5', status: 'UNVERIFIABLE', discrepancies: [], confidence: 1, createdAt: '' },
      ];

      const summary = createValidationSummary(results);

      expect(summary.totalComponents).toBe(5);
      expect(summary.validCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.invalidCount).toBe(1);
      expect(summary.staleCount).toBe(1);
      expect(summary.unverifiableCount).toBe(1);
    });
  });

  describe('Discrepancy Detection Edge Cases', () => {
    it('should handle empty documents array', () => {
      const detector = new DiscrepancyDetector();

      const component = {
        id: 'comp-1',
        title: 'Test Component',
        description: 'Test',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const discrepancies = detector.detectContentMismatch(component, []);
      expect(discrepancies).toEqual([]);
    });

    it('should handle components with all valid data', () => {
      const detector = new DiscrepancyDetector();

      const component = {
        id: 'comp-1',
        title: 'Valid Component',
        description: 'This is a valid description',
        componentType: 'SYSTEM',
        sourceExcerpt: 'Valid Component handles requests',
      };

      const documents = [
        {
          id: 'doc-1',
          content: 'The Valid Component handles requests from users efficiently.',
          filename: 'docs.md',
        },
      ];

      const discrepancies = detector.detectDiscrepancies(component, documents);
      expect(discrepancies.length).toBe(0);
    });

    it('should detect conflicting sources when component mentioned differently', () => {
      const detector = new DiscrepancyDetector();

      const component = {
        id: 'comp-1',
        title: 'Auth Service',
        description: 'Handles authentication',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents = [
        {
          id: 'doc-1',
          content: 'The Auth Service provides secure authentication.',
          filename: 'current.md',
        },
        {
          id: 'doc-2',
          content: 'Auth Service has been deprecated and should not be used.',
          filename: 'updates.md',
        },
      ];

      const discrepancies = detector.detectConflictingSources(component, documents);
      expect(discrepancies.some(d => d.type === 'CONFLICTING_SOURCES')).toBe(true);
    });
  });

  describe('Scoring Service Edge Cases', () => {
    it('should handle empty results array', () => {
      const service = new ScoringService();

      const score = service.calculateWeightedScore([], new Map());
      expect(score).toBe(0);

      const breakdown = service.calculateScoreBreakdown([]);
      expect(breakdown.contentAccuracy).toBe(100);
      expect(breakdown.dataCompleteness).toBe(100);
    });

    it('should apply component type weights correctly', () => {
      const service = new ScoringService();

      const results: ValidationResult[] = [
        { id: 'r1', validationRunId: 'run', componentId: 'c1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: 'r2', validationRunId: 'run', componentId: 'c2', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
      ];

      // With higher weight on DATABASE
      const typesWithDb = new Map([
        ['c1', 'DATABASE'],
        ['c2', 'USER_ACTION'],
      ]);

      const score = service.calculateWeightedScore(results, typesWithDb);
      expect(score).toBe(100); // All VALID should still be 100%
    });

    it('should correctly calculate health status thresholds', () => {
      const service = new ScoringService();

      expect(service.getHealthStatus(100)).toBe('EXCELLENT');
      expect(service.getHealthStatus(90)).toBe('EXCELLENT');
      expect(service.getHealthStatus(89)).toBe('GOOD');
      expect(service.getHealthStatus(75)).toBe('GOOD');
      expect(service.getHealthStatus(74)).toBe('FAIR');
      expect(service.getHealthStatus(60)).toBe('FAIR');
      expect(service.getHealthStatus(59)).toBe('POOR');
      expect(service.getHealthStatus(40)).toBe('POOR');
      expect(service.getHealthStatus(39)).toBe('CRITICAL');
      expect(service.getHealthStatus(0)).toBe('CRITICAL');
    });
  });

  describe('Singleton Instances', () => {
    it('should export singleton validation service', () => {
      expect(validationService).toBeInstanceOf(ValidationService);
    });

    it('should export singleton discrepancy detector', () => {
      expect(discrepancyDetector).toBeInstanceOf(DiscrepancyDetector);
    });

    it('should export singleton scoring service', () => {
      expect(scoringService).toBeInstanceOf(ScoringService);
    });
  });
});
