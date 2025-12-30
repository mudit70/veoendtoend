import { describe, it, expect } from 'vitest';
import {
  calculateValidationScore,
  getDiscrepancySeverity,
  determineValidationStatus,
  createValidationSummary,
  type ValidationResult,
  type Discrepancy,
  type ValidationStatus,
  type DiscrepancyType,
} from '../models/validation';

describe('Validation Model', () => {
  describe('calculateValidationScore', () => {
    it('should return 0 for empty results', () => {
      expect(calculateValidationScore([])).toBe(0);
    });

    it('should return 100 for all VALID results', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '2', validationRunId: 'run1', componentId: 'comp2', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
      ];
      expect(calculateValidationScore(results)).toBe(100);
    });

    it('should return 0 for all INVALID results', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'INVALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '2', validationRunId: 'run1', componentId: 'comp2', status: 'INVALID', discrepancies: [], confidence: 1, createdAt: '' },
      ];
      expect(calculateValidationScore(results)).toBe(0);
    });

    it('should calculate weighted score correctly', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '2', validationRunId: 'run1', componentId: 'comp2', status: 'WARNING', discrepancies: [], confidence: 1, createdAt: '' },
      ];
      // (1.0 * 1 + 0.7 * 1) / (1 + 1) * 100 = 85
      expect(calculateValidationScore(results)).toBe(85);
    });

    it('should account for confidence in scoring', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'VALID', discrepancies: [], confidence: 0.5, createdAt: '' },
        { id: '2', validationRunId: 'run1', componentId: 'comp2', status: 'INVALID', discrepancies: [], confidence: 0.5, createdAt: '' },
      ];
      // (1.0 * 0.5 + 0.0 * 0.5) / (0.5 + 0.5) * 100 = 50
      expect(calculateValidationScore(results)).toBe(50);
    });

    it('should handle STALE status correctly', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'STALE', discrepancies: [], confidence: 1, createdAt: '' },
      ];
      // 0.5 * 1 / 1 * 100 = 50
      expect(calculateValidationScore(results)).toBe(50);
    });

    it('should handle UNVERIFIABLE status correctly', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'UNVERIFIABLE', discrepancies: [], confidence: 1, createdAt: '' },
      ];
      // 0.3 * 1 / 1 * 100 = 30
      expect(calculateValidationScore(results)).toBe(30);
    });
  });

  describe('getDiscrepancySeverity', () => {
    it('should return high for CONTENT_MISMATCH', () => {
      expect(getDiscrepancySeverity('CONTENT_MISMATCH')).toBe('high');
    });

    it('should return medium for MISSING_DATA', () => {
      expect(getDiscrepancySeverity('MISSING_DATA')).toBe('medium');
    });

    it('should return critical for CONFLICTING_SOURCES', () => {
      expect(getDiscrepancySeverity('CONFLICTING_SOURCES')).toBe('critical');
    });

    it('should return low for OUTDATED_REFERENCE', () => {
      expect(getDiscrepancySeverity('OUTDATED_REFERENCE')).toBe('low');
    });

    it('should return high for SCHEMA_VIOLATION', () => {
      expect(getDiscrepancySeverity('SCHEMA_VIOLATION')).toBe('high');
    });
  });

  describe('determineValidationStatus', () => {
    it('should return VALID for no discrepancies', () => {
      expect(determineValidationStatus([])).toBe('VALID');
    });

    it('should return INVALID for critical discrepancy', () => {
      const discrepancies: Discrepancy[] = [
        { type: 'CONFLICTING_SOURCES', severity: 'critical', message: 'Conflict found' },
      ];
      expect(determineValidationStatus(discrepancies)).toBe('INVALID');
    });

    it('should return WARNING for high severity discrepancy', () => {
      const discrepancies: Discrepancy[] = [
        { type: 'CONTENT_MISMATCH', severity: 'high', message: 'Content mismatch' },
      ];
      expect(determineValidationStatus(discrepancies)).toBe('WARNING');
    });

    it('should return WARNING for medium severity discrepancy', () => {
      const discrepancies: Discrepancy[] = [
        { type: 'MISSING_DATA', severity: 'medium', message: 'Missing data' },
      ];
      expect(determineValidationStatus(discrepancies)).toBe('WARNING');
    });

    it('should return VALID for low severity discrepancy', () => {
      const discrepancies: Discrepancy[] = [
        { type: 'OUTDATED_REFERENCE', severity: 'low', message: 'Outdated reference' },
      ];
      expect(determineValidationStatus(discrepancies)).toBe('VALID');
    });

    it('should prioritize critical over high', () => {
      const discrepancies: Discrepancy[] = [
        { type: 'CONTENT_MISMATCH', severity: 'high', message: 'Mismatch' },
        { type: 'CONFLICTING_SOURCES', severity: 'critical', message: 'Conflict' },
      ];
      expect(determineValidationStatus(discrepancies)).toBe('INVALID');
    });
  });

  describe('createValidationSummary', () => {
    it('should create empty summary for no results', () => {
      const summary = createValidationSummary([]);

      expect(summary.totalComponents).toBe(0);
      expect(summary.validCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.invalidCount).toBe(0);
      expect(summary.unverifiableCount).toBe(0);
      expect(summary.staleCount).toBe(0);
      expect(summary.overallScore).toBe(0);
    });

    it('should count status types correctly', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '2', validationRunId: 'run1', componentId: 'comp2', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '3', validationRunId: 'run1', componentId: 'comp3', status: 'WARNING', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '4', validationRunId: 'run1', componentId: 'comp4', status: 'INVALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '5', validationRunId: 'run1', componentId: 'comp5', status: 'UNVERIFIABLE', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '6', validationRunId: 'run1', componentId: 'comp6', status: 'STALE', discrepancies: [], confidence: 1, createdAt: '' },
      ];

      const summary = createValidationSummary(results);

      expect(summary.totalComponents).toBe(6);
      expect(summary.validCount).toBe(2);
      expect(summary.warningCount).toBe(1);
      expect(summary.invalidCount).toBe(1);
      expect(summary.unverifiableCount).toBe(1);
      expect(summary.staleCount).toBe(1);
    });

    it('should calculate overall score', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
        { id: '2', validationRunId: 'run1', componentId: 'comp2', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
      ];

      const summary = createValidationSummary(results);

      expect(summary.overallScore).toBe(100);
    });

    it('should include lastValidatedAt', () => {
      const results: ValidationResult[] = [
        { id: '1', validationRunId: 'run1', componentId: 'comp1', status: 'VALID', discrepancies: [], confidence: 1, createdAt: '' },
      ];

      const summary = createValidationSummary(results, '2024-01-01T00:00:00Z');

      expect(summary.lastValidatedAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Type Definitions', () => {
    it('should have valid ValidationStatus types', () => {
      const statuses: ValidationStatus[] = ['VALID', 'WARNING', 'INVALID', 'UNVERIFIABLE', 'STALE'];
      expect(statuses).toHaveLength(5);
    });

    it('should have valid DiscrepancyType types', () => {
      const types: DiscrepancyType[] = [
        'CONTENT_MISMATCH',
        'MISSING_DATA',
        'CONFLICTING_SOURCES',
        'OUTDATED_REFERENCE',
        'SCHEMA_VIOLATION',
      ];
      expect(types).toHaveLength(5);
    });
  });
});
