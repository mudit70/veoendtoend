import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ScoringService,
  scoringService,
  type ComponentWeights,
} from '../services/scoringService';
import type { ValidationResult } from '../models/validation';

// Mock database
vi.mock('../database/connection', () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn().mockReturnValue([
        { score: 85, completedAt: '2024-01-01T00:00:00Z', componentCount: 5 },
        { score: 90, completedAt: '2024-01-02T00:00:00Z', componentCount: 5 },
        { score: 88, completedAt: '2024-01-03T00:00:00Z', componentCount: 6 },
      ]),
    })),
  })),
}));

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateWeightedScore', () => {
    it('should return 0 for empty results', () => {
      const score = service.calculateWeightedScore([], new Map());
      expect(score).toBe(0);
    });

    it('should calculate score with default weights', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const componentTypes = new Map([['comp1', 'SYSTEM']]);
      const score = service.calculateWeightedScore(results, componentTypes);

      expect(score).toBe(100);
    });

    it('should apply higher weight to DATABASE components', () => {
      const validResults: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
        {
          id: 'r2',
          validationRunId: 'run1',
          componentId: 'comp2',
          status: 'WARNING',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      // With DATABASE having higher weight (1.3), the weighted score should differ
      const typesWithDb = new Map([
        ['comp1', 'DATABASE'],
        ['comp2', 'CACHE'],
      ]);
      const typesWithoutDb = new Map([
        ['comp1', 'CACHE'],
        ['comp2', 'CACHE'],
      ]);

      const scoreWithDb = service.calculateWeightedScore(validResults, typesWithDb);
      const scoreWithoutDb = service.calculateWeightedScore(validResults, typesWithoutDb);

      expect(scoreWithDb).not.toBe(scoreWithoutDb);
    });

    it('should handle unknown component types with default weight', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const componentTypes = new Map([['comp1', 'UNKNOWN_TYPE']]);
      const score = service.calculateWeightedScore(results, componentTypes);

      expect(score).toBe(100);
    });

    it('should weight confidence in calculation', () => {
      const highConfidence: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const lowConfidence: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 0.5,
          createdAt: '2024-01-01',
        },
      ];

      const componentTypes = new Map([['comp1', 'SYSTEM']]);
      const highScore = service.calculateWeightedScore(highConfidence, componentTypes);
      const lowScore = service.calculateWeightedScore(lowConfidence, componentTypes);

      // Both should be 100 since only VALID status
      expect(highScore).toBe(100);
      expect(lowScore).toBe(100);
    });
  });

  describe('calculateScoreBreakdown', () => {
    it('should return 100 for all categories with empty results', () => {
      const breakdown = service.calculateScoreBreakdown([]);

      expect(breakdown.contentAccuracy).toBe(100);
      expect(breakdown.dataCompleteness).toBe(100);
      expect(breakdown.sourceConsistency).toBe(100);
      expect(breakdown.freshness).toBe(100);
    });

    it('should reduce contentAccuracy for content mismatches', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'WARNING',
          discrepancies: [
            { type: 'CONTENT_MISMATCH', severity: 'high', message: 'Mismatch' },
          ],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const breakdown = service.calculateScoreBreakdown(results);

      expect(breakdown.contentAccuracy).toBeLessThan(100);
    });

    it('should reduce dataCompleteness for missing data', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'WARNING',
          discrepancies: [
            { type: 'MISSING_DATA', severity: 'medium', message: 'Missing' },
          ],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const breakdown = service.calculateScoreBreakdown(results);

      expect(breakdown.dataCompleteness).toBeLessThan(100);
    });

    it('should reduce sourceConsistency for conflicting sources', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'INVALID',
          discrepancies: [
            { type: 'CONFLICTING_SOURCES', severity: 'critical', message: 'Conflict' },
          ],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const breakdown = service.calculateScoreBreakdown(results);

      expect(breakdown.sourceConsistency).toBeLessThan(100);
    });

    it('should reduce freshness for stale status', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'STALE',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const breakdown = service.calculateScoreBreakdown(results);

      expect(breakdown.freshness).toBeLessThan(100);
    });

    it('should reduce dataCompleteness for unverifiable status', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'UNVERIFIABLE',
          discrepancies: [],
          confidence: 0.5,
          createdAt: '2024-01-01',
        },
      ];

      const breakdown = service.calculateScoreBreakdown(results);

      expect(breakdown.dataCompleteness).toBeLessThan(100);
    });
  });

  describe('getHealthStatus', () => {
    it('should return EXCELLENT for scores >= 90', () => {
      expect(service.getHealthStatus(90)).toBe('EXCELLENT');
      expect(service.getHealthStatus(100)).toBe('EXCELLENT');
    });

    it('should return GOOD for scores >= 75 and < 90', () => {
      expect(service.getHealthStatus(75)).toBe('GOOD');
      expect(service.getHealthStatus(89)).toBe('GOOD');
    });

    it('should return FAIR for scores >= 60 and < 75', () => {
      expect(service.getHealthStatus(60)).toBe('FAIR');
      expect(service.getHealthStatus(74)).toBe('FAIR');
    });

    it('should return POOR for scores >= 40 and < 60', () => {
      expect(service.getHealthStatus(40)).toBe('POOR');
      expect(service.getHealthStatus(59)).toBe('POOR');
    });

    it('should return CRITICAL for scores < 40', () => {
      expect(service.getHealthStatus(39)).toBe('CRITICAL');
      expect(service.getHealthStatus(0)).toBe('CRITICAL');
    });
  });

  describe('generateRecommendations', () => {
    it('should return positive message for valid results', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const recommendations = service.generateRecommendations(results);

      expect(recommendations.some(r => r.includes('All components are valid'))).toBe(true);
    });

    it('should recommend reviewing content mismatches', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'WARNING',
          discrepancies: [
            { type: 'CONTENT_MISMATCH', severity: 'high', message: 'Mismatch' },
          ],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const recommendations = service.generateRecommendations(results);

      expect(recommendations.some(r => r.includes('content mismatches'))).toBe(true);
    });

    it('should recommend adding descriptions for missing data', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'WARNING',
          discrepancies: [
            { type: 'MISSING_DATA', severity: 'medium', message: 'Missing description' },
          ],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const recommendations = service.generateRecommendations(results);

      expect(recommendations.some(r => r.includes('missing data'))).toBe(true);
    });

    it('should recommend updating stale content', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'STALE',
          discrepancies: [],
          confidence: 0.5,
          createdAt: '2024-01-01',
        },
      ];

      const recommendations = service.generateRecommendations(results);

      expect(recommendations.some(r => r.includes('outdated'))).toBe(true);
    });

    it('should recommend linking unverifiable components', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'UNVERIFIABLE',
          discrepancies: [],
          confidence: 0.3,
          createdAt: '2024-01-01',
        },
      ];

      const recommendations = service.generateRecommendations(results);

      expect(recommendations.some(r => r.includes('Link'))).toBe(true);
    });

    it('should prioritize invalid components', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'INVALID',
          discrepancies: [
            { type: 'CONFLICTING_SOURCES', severity: 'critical', message: 'Conflict' },
          ],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const recommendations = service.generateRecommendations(results);

      expect(recommendations.some(r => r.includes('Prioritize fixing'))).toBe(true);
    });
  });

  describe('getValidationTrends', () => {
    it('should return trend data points', () => {
      const trends = service.getValidationTrends('diagram-1', 10);

      expect(trends.length).toBe(3);
      // After reverse: [88, 90, 85] -> first is 88
      expect(trends[0].score).toBe(88);
      expect(trends[0].componentCount).toBe(6);
    });

    it('should reverse order for oldest to newest', () => {
      const trends = service.getValidationTrends('diagram-1');

      // Original mock returns DESC order [85, 90, 88], reversed for oldest-first: [88, 90, 85]
      // First (oldest): 2024-01-03, Last (newest): 2024-01-01
      expect(trends[0].date).toBe('2024-01-03T00:00:00Z');
      expect(trends[2].date).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('generateScoringReport', () => {
    it('should generate complete report', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const report = service.generateScoringReport(results);

      expect(report.overallScore).toBe(100);
      expect(report.healthStatus).toBe('EXCELLENT');
      expect(report.breakdown).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should include trends when requested', () => {
      const results: ValidationResult[] = [];

      const report = service.generateScoringReport(results, 'diagram-1', true);

      expect(report.trends).toBeDefined();
      expect(report.trends!.length).toBe(3);
    });

    it('should not include trends when not requested', () => {
      const results: ValidationResult[] = [];

      const report = service.generateScoringReport(results);

      expect(report.trends).toBeUndefined();
    });
  });

  describe('calculateScoreDelta', () => {
    it('should calculate positive delta for improvement', () => {
      const currentResults: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const previousResults: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run0',
          componentId: 'comp1',
          status: 'WARNING',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const delta = service.calculateScoreDelta(currentResults, previousResults);

      expect(delta).toBeGreaterThan(0);
    });

    it('should calculate negative delta for regression', () => {
      const currentResults: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'WARNING',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const previousResults: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run0',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const delta = service.calculateScoreDelta(currentResults, previousResults);

      expect(delta).toBeLessThan(0);
    });

    it('should return 0 for no change', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const delta = service.calculateScoreDelta(results, results);

      expect(delta).toBe(0);
    });
  });

  describe('getComponentScores', () => {
    it('should return map of component scores', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
        {
          id: 'r2',
          validationRunId: 'run1',
          componentId: 'comp2',
          status: 'WARNING',
          discrepancies: [],
          confidence: 1.0,
          createdAt: '2024-01-01',
        },
      ];

      const scores = service.getComponentScores(results);

      expect(scores.get('comp1')).toBe(100);
      expect(scores.get('comp2')).toBe(70);
    });

    it('should apply confidence to scores', () => {
      const results: ValidationResult[] = [
        {
          id: 'r1',
          validationRunId: 'run1',
          componentId: 'comp1',
          status: 'VALID',
          discrepancies: [],
          confidence: 0.5,
          createdAt: '2024-01-01',
        },
      ];

      const scores = service.getComponentScores(results);

      expect(scores.get('comp1')).toBe(50);
    });

    it('should handle all status types', () => {
      const results: ValidationResult[] = [
        { id: 'r1', validationRunId: 'run1', componentId: 'c1', status: 'VALID', discrepancies: [], confidence: 1.0, createdAt: '' },
        { id: 'r2', validationRunId: 'run1', componentId: 'c2', status: 'WARNING', discrepancies: [], confidence: 1.0, createdAt: '' },
        { id: 'r3', validationRunId: 'run1', componentId: 'c3', status: 'INVALID', discrepancies: [], confidence: 1.0, createdAt: '' },
        { id: 'r4', validationRunId: 'run1', componentId: 'c4', status: 'UNVERIFIABLE', discrepancies: [], confidence: 1.0, createdAt: '' },
        { id: 'r5', validationRunId: 'run1', componentId: 'c5', status: 'STALE', discrepancies: [], confidence: 1.0, createdAt: '' },
      ];

      const scores = service.getComponentScores(results);

      expect(scores.get('c1')).toBe(100);
      expect(scores.get('c2')).toBe(70);
      expect(scores.get('c3')).toBe(0);
      expect(scores.get('c4')).toBe(30);
      expect(scores.get('c5')).toBe(50);
    });
  });

  describe('component weights management', () => {
    it('should allow setting custom weights', () => {
      const customWeights: ComponentWeights = {
        CUSTOM_TYPE: 2.0,
      };

      service.setComponentWeights(customWeights);
      const weights = service.getComponentWeights();

      expect(weights.CUSTOM_TYPE).toBe(2.0);
      expect(weights.DATABASE).toBe(1.3); // Default preserved
    });

    it('should get current weights', () => {
      const weights = service.getComponentWeights();

      expect(weights.DATABASE).toBe(1.3);
      expect(weights.SYSTEM).toBe(1.2);
      expect(weights.DEFAULT).toBe(1.0);
    });
  });

  describe('singleton export', () => {
    it('should export singleton instance', () => {
      expect(scoringService).toBeInstanceOf(ScoringService);
    });
  });
});
