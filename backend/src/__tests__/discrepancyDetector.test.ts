import { describe, it, expect, beforeEach } from 'vitest';
import {
  DiscrepancyDetector,
  discrepancyDetector,
  type ComponentData,
  type DocumentData,
} from '../services/discrepancyDetector';

describe('DiscrepancyDetector', () => {
  let detector: DiscrepancyDetector;

  beforeEach(() => {
    detector = new DiscrepancyDetector();
  });

  describe('detectContentMismatch', () => {
    it('should detect when source excerpt not found in document', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'User Authentication',
        description: 'Handles user login',
        componentType: 'SYSTEM',
        sourceExcerpt: 'This component handles OAuth2 authentication',
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The system uses basic password authentication only.',
          filename: 'auth.md',
        },
      ];

      const discrepancies = detector.detectContentMismatch(component, documents);

      expect(discrepancies.length).toBeGreaterThan(0);
      expect(discrepancies.some(d => d.type === 'CONTENT_MISMATCH')).toBe(true);
    });

    it('should not flag when source excerpt is found in document', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'User Authentication',
        description: 'Handles user login',
        componentType: 'SYSTEM',
        sourceExcerpt: 'OAuth2 authentication',
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The system uses OAuth2 authentication for all users.',
          filename: 'auth.md',
        },
      ];

      const discrepancies = detector.detectContentMismatch(component, documents);

      // Title is found, excerpt is found - should have fewer discrepancies
      const excerptMismatch = discrepancies.filter(
        d => d.message.includes('excerpt not found')
      );
      expect(excerptMismatch.length).toBe(0);
    });

    it('should detect when component title not mentioned in document', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Payment Gateway',
        description: 'Handles payments',
        componentType: 'SYSTEM',
        sourceExcerpt: 'payment processing',
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'This document describes payment processing without mentioning the gateway.',
          filename: 'payments.md',
        },
      ];

      const discrepancies = detector.detectContentMismatch(component, documents);

      const titleMismatch = discrepancies.filter(
        d => d.message.includes('not found in source document')
      );
      expect(titleMismatch.length).toBe(1);
    });

    it('should return empty array when no documents provided', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test',
        description: 'Test',
        componentType: 'SYSTEM',
        sourceExcerpt: 'test excerpt',
      };

      const discrepancies = detector.detectContentMismatch(component, []);

      expect(discrepancies.length).toBe(0);
    });

    it('should return empty array when no source excerpt', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test',
        description: 'Test',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents: DocumentData[] = [
        { id: 'doc-1', content: 'Some content', filename: 'test.md' },
      ];

      const discrepancies = detector.detectContentMismatch(component, documents);

      // Should only check title, not excerpt
      const excerptMismatch = discrepancies.filter(
        d => d.message.includes('excerpt')
      );
      expect(excerptMismatch.length).toBe(0);
    });

    it('should use fuzzy matching for partial content matches', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'API Gateway',
        description: 'Routes API requests',
        componentType: 'SYSTEM',
        sourceExcerpt: 'The API gateway routes incoming requests to appropriate microservices',
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The system API gateway handles routing of incoming requests to the appropriate microservices layer.',
          filename: 'architecture.md',
        },
      ];

      const discrepancies = detector.detectContentMismatch(component, documents);

      // Fuzzy match should find the excerpt (80% word match)
      const excerptMismatch = discrepancies.filter(
        d => d.message.includes('excerpt not found')
      );
      expect(excerptMismatch.length).toBe(0);
    });
  });

  describe('detectMissingData', () => {
    it('should detect missing description', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test Component',
        description: null,
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const discrepancies = detector.detectMissingData(component, []);

      expect(discrepancies.some(d => d.message.includes('missing a description'))).toBe(true);
    });

    it('should detect empty description', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test Component',
        description: '   ',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const discrepancies = detector.detectMissingData(component, []);

      expect(discrepancies.some(d => d.message.includes('missing a description'))).toBe(true);
    });

    it('should detect missing source excerpt when documents exist', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test Component',
        description: 'Valid description',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents: DocumentData[] = [
        { id: 'doc-1', content: 'Document content', filename: 'doc.md' },
      ];

      const discrepancies = detector.detectMissingData(component, documents);

      expect(discrepancies.some(d => d.message.includes('no linked source excerpt'))).toBe(true);
    });

    it('should not flag missing excerpt when no documents', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test Component',
        description: 'Valid description',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const discrepancies = detector.detectMissingData(component, []);

      expect(discrepancies.some(d => d.message.includes('source excerpt'))).toBe(false);
    });

    it('should detect very short title', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'AB',
        description: 'Valid description',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const discrepancies = detector.detectMissingData(component, []);

      expect(discrepancies.some(d => d.message.includes('title is too short'))).toBe(true);
    });

    it('should not flag valid component', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Valid Component Title',
        description: 'Valid description here',
        componentType: 'SYSTEM',
        sourceExcerpt: 'Source excerpt content',
      };

      const discrepancies = detector.detectMissingData(component, []);

      expect(discrepancies.length).toBe(0);
    });
  });

  describe('detectConflictingSources', () => {
    it('should detect conflicting descriptions across documents', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Database',
        description: 'Stores data',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The Database component stores user records efficiently.',
          filename: 'doc1.md',
        },
        {
          id: 'doc-2',
          content: 'The Database is deprecated and should not be used anymore.',
          filename: 'doc2.md',
        },
      ];

      const discrepancies = detector.detectConflictingSources(component, documents);

      expect(discrepancies.some(d => d.type === 'CONFLICTING_SOURCES')).toBe(true);
    });

    it('should not flag when only one document', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Database',
        description: 'Stores data',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The Database component stores data.',
          filename: 'doc1.md',
        },
      ];

      const discrepancies = detector.detectConflictingSources(component, documents);

      expect(discrepancies.length).toBe(0);
    });

    it('should not flag when consistent information', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'API',
        description: 'Handles requests',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The API handles incoming HTTP requests.',
          filename: 'doc1.md',
        },
        {
          id: 'doc-2',
          content: 'The API processes all incoming requests from clients.',
          filename: 'doc2.md',
        },
      ];

      const discrepancies = detector.detectConflictingSources(component, documents);

      expect(discrepancies.length).toBe(0);
    });

    it('should detect removed/obsolete conflicts', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Legacy Service',
        description: 'Old service',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'Legacy Service provides core functionality.',
          filename: 'current.md',
        },
        {
          id: 'doc-2',
          content: 'Legacy Service has been removed from the system.',
          filename: 'changelog.md',
        },
      ];

      const discrepancies = detector.detectConflictingSources(component, documents);

      expect(discrepancies.some(d => d.type === 'CONFLICTING_SOURCES')).toBe(true);
    });
  });

  describe('detectDiscrepancies', () => {
    it('should combine all discrepancy types', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'AB', // Too short
        description: null, // Missing
        componentType: 'SYSTEM',
        sourceExcerpt: 'Unique content not in docs',
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'Some document content.',
          filename: 'doc.md',
        },
      ];

      const discrepancies = detector.detectDiscrepancies(component, documents);

      expect(discrepancies.length).toBeGreaterThan(1);
      expect(discrepancies.some(d => d.type === 'MISSING_DATA')).toBe(true);
    });

    it('should return empty array for valid component', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Valid Component',
        description: 'A valid description',
        componentType: 'SYSTEM',
        sourceExcerpt: 'Valid Component handles requests',
      };

      const documents: DocumentData[] = [
        {
          id: 'doc-1',
          content: 'The Valid Component handles requests from users.',
          filename: 'doc.md',
        },
      ];

      const discrepancies = detector.detectDiscrepancies(component, documents);

      expect(discrepancies.length).toBe(0);
    });
  });

  describe('generateSuggestedFixes', () => {
    it('should suggest UPDATE_TITLE for content mismatch with expected value', () => {
      const discrepancies = [
        {
          type: 'CONTENT_MISMATCH' as const,
          severity: 'high' as const,
          message: 'Content mismatch found',
          expectedValue: 'Expected Title',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'UPDATE_TITLE')).toBe(true);
      expect(fixes.some(f => f.suggestedValue === 'Expected Title')).toBe(true);
    });

    it('should suggest REVIEW_MANUALLY for content mismatch without expected value', () => {
      const discrepancies = [
        {
          type: 'CONTENT_MISMATCH' as const,
          severity: 'high' as const,
          message: 'Content mismatch found',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'REVIEW_MANUALLY')).toBe(true);
    });

    it('should suggest UPDATE_DESCRIPTION for missing description', () => {
      const discrepancies = [
        {
          type: 'MISSING_DATA' as const,
          severity: 'medium' as const,
          message: 'Component is missing a description',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'UPDATE_DESCRIPTION')).toBe(true);
    });

    it('should suggest ADD_SOURCE for missing source excerpt', () => {
      const discrepancies = [
        {
          type: 'MISSING_DATA' as const,
          severity: 'low' as const,
          message: 'Component has no linked source excerpt',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'ADD_SOURCE')).toBe(true);
    });

    it('should suggest REVIEW_MANUALLY for conflicting sources', () => {
      const discrepancies = [
        {
          type: 'CONFLICTING_SOURCES' as const,
          severity: 'high' as const,
          message: 'Conflicting information found',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'REVIEW_MANUALLY')).toBe(true);
    });

    it('should suggest REVIEW_MANUALLY for outdated reference', () => {
      const discrepancies = [
        {
          type: 'OUTDATED_REFERENCE' as const,
          severity: 'medium' as const,
          message: 'Reference may be outdated',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'REVIEW_MANUALLY')).toBe(true);
    });

    it('should suggest REVIEW_MANUALLY for schema violation', () => {
      const discrepancies = [
        {
          type: 'SCHEMA_VIOLATION' as const,
          severity: 'critical' as const,
          message: 'Schema violation detected',
        },
      ];

      const fixes = detector.generateSuggestedFixes(discrepancies);

      expect(fixes.some(f => f.type === 'REVIEW_MANUALLY')).toBe(true);
    });

    it('should return empty array for empty discrepancies', () => {
      const fixes = detector.generateSuggestedFixes([]);

      expect(fixes.length).toBe(0);
    });
  });

  describe('calculateOverallSeverity', () => {
    it('should return NONE for empty discrepancies', () => {
      const severity = detector.calculateOverallSeverity([]);

      expect(severity).toBe('NONE');
    });

    it('should return CRITICAL for critical discrepancies', () => {
      const discrepancies = [
        { type: 'CONTENT_MISMATCH' as const, severity: 'critical' as const, message: 'test' },
      ];

      const severity = detector.calculateOverallSeverity(discrepancies);

      expect(severity).toBe('CRITICAL');
    });

    it('should return MAJOR for high severity discrepancies', () => {
      const discrepancies = [
        { type: 'CONTENT_MISMATCH' as const, severity: 'high' as const, message: 'test' },
      ];

      const severity = detector.calculateOverallSeverity(discrepancies);

      expect(severity).toBe('MAJOR');
    });

    it('should return MINOR for medium severity discrepancies', () => {
      const discrepancies = [
        { type: 'MISSING_DATA' as const, severity: 'medium' as const, message: 'test' },
      ];

      const severity = detector.calculateOverallSeverity(discrepancies);

      expect(severity).toBe('MINOR');
    });

    it('should return MINOR for low severity discrepancies', () => {
      const discrepancies = [
        { type: 'MISSING_DATA' as const, severity: 'low' as const, message: 'test' },
      ];

      const severity = detector.calculateOverallSeverity(discrepancies);

      expect(severity).toBe('MINOR');
    });

    it('should return highest severity when multiple present', () => {
      const discrepancies = [
        { type: 'MISSING_DATA' as const, severity: 'low' as const, message: 'test' },
        { type: 'CONTENT_MISMATCH' as const, severity: 'critical' as const, message: 'test' },
        { type: 'CONFLICTING_SOURCES' as const, severity: 'high' as const, message: 'test' },
      ];

      const severity = detector.calculateOverallSeverity(discrepancies);

      expect(severity).toBe('CRITICAL');
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(discrepancyDetector).toBeInstanceOf(DiscrepancyDetector);
    });

    it('should be usable directly', () => {
      const component: ComponentData = {
        id: 'comp-1',
        title: 'Test',
        description: 'Test',
        componentType: 'SYSTEM',
        sourceExcerpt: null,
      };

      const result = discrepancyDetector.detectDiscrepancies(component, []);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
