import { describe, it, expect } from 'vitest';
import { ExtractionEngine } from '../services/extractionEngine';
import type { ComponentType } from '@veoendtoend/shared';

describe('ExtractionEngine', () => {
  const engine = new ExtractionEngine();

  const sampleDocuments = [
    {
      id: 'doc-1',
      filename: 'api-spec.md',
      content: `
# User Authentication API

## User Login Endpoint

The user clicks the login button to submit their credentials.
The frontend client uses React to handle the form submission.
The POST /api/auth/login endpoint receives the request.
The backend service validates the credentials.
User data is stored in PostgreSQL database.
On success, the view updates to show the dashboard.
      `,
    },
    {
      id: 'doc-2',
      filename: 'architecture.md',
      content: `
# System Architecture

The application uses AWS infrastructure:
- CloudFront for CDN
- AWS WAF for security
- Application Load Balancer (ALB) for load balancing
- API Gateway for request routing
- EC2 instances for compute
- RDS PostgreSQL for database

Events are processed via AWS SQS queue.
      `,
    },
  ];

  describe('detectComponentData', () => {
    it('should detect USER_ACTION with high confidence', () => {
      const result = engine.detectComponentData('USER_ACTION', sampleDocuments);

      expect(result.hasData).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.relevantDocument).toBeDefined();
    });

    it('should detect CLIENT_CODE data', () => {
      const result = engine.detectComponentData('CLIENT_CODE', sampleDocuments);

      expect(result.hasData).toBe(true);
      expect(result.relevantDocument?.id).toBe('doc-1');
    });

    it('should detect API_ENDPOINT data', () => {
      const result = engine.detectComponentData('API_ENDPOINT', sampleDocuments);

      expect(result.hasData).toBe(true);
    });

    it('should detect DATABASE data', () => {
      const result = engine.detectComponentData('DATABASE', sampleDocuments);

      expect(result.hasData).toBe(true);
    });

    it('should detect LOAD_BALANCER from architecture doc', () => {
      const result = engine.detectComponentData('LOAD_BALANCER', sampleDocuments);

      expect(result.hasData).toBe(true);
      expect(result.relevantDocument?.id).toBe('doc-2');
    });

    it('should detect WAF from architecture doc', () => {
      const result = engine.detectComponentData('WAF', sampleDocuments);

      expect(result.hasData).toBe(true);
    });

    it('should return hasData: false for empty documents', () => {
      const result = engine.detectComponentData('FIREWALL', []);

      expect(result.hasData).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('extractComponentDetails', () => {
    it('should extract details for each component type', async () => {
      const componentTypes: ComponentType[] = [
        'USER_ACTION', 'CLIENT_CODE', 'API_ENDPOINT', 'BACKEND_LOGIC', 'DATABASE'
      ];

      for (const componentType of componentTypes) {
        const result = await engine.extractComponentDetails(
          componentType,
          'User Login',
          'Authenticates user with credentials',
          sampleDocuments
        );

        expect(result.title).toBeTruthy();
        expect(result.description).toBeTruthy();
        expect(typeof result.confidence).toBe('number');
        expect(typeof result.hasData).toBe('boolean');
      }
    });

    it('should include source excerpts', async () => {
      const result = await engine.extractComponentDetails(
        'API_ENDPOINT',
        'User Login',
        'Authenticates user',
        sampleDocuments
      );

      expect(result.hasData).toBe(true);
      if (result.hasData) {
        expect(result.sourceExcerpt).toBeTruthy();
        expect(result.sourceDocumentId).toBe('doc-1');
      }
    });

    it('should return greyed out state when no data found', async () => {
      const emptyDocs = [
        {
          id: 'doc-empty',
          filename: 'empty.txt',
          content: 'This document has no relevant technical content.',
        },
      ];

      const result = await engine.extractComponentDetails(
        'FIREWALL',
        'Some Operation',
        'Description',
        emptyDocs
      );

      expect(result.hasData).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.description).toBe('No relevant data found in documents');
    });
  });

  describe('extractAllComponents', () => {
    it('should extract all 11 component types', async () => {
      const results = await engine.extractAllComponents(
        'User Login',
        'User authentication operation',
        sampleDocuments
      );

      expect(results.size).toBe(11);

      // Check specific components
      const userAction = results.get('USER_ACTION');
      expect(userAction).toBeDefined();
      expect(userAction!.hasData).toBe(true);

      const database = results.get('DATABASE');
      expect(database).toBeDefined();
      expect(database!.hasData).toBe(true);
    });

    it('should handle empty document list', async () => {
      const results = await engine.extractAllComponents(
        'Test Op',
        'Description',
        []
      );

      expect(results.size).toBe(11);

      // All should be greyed out
      for (const [, result] of results) {
        expect(result.hasData).toBe(false);
      }
    });
  });

  describe('getPromptTemplate', () => {
    it('should return prompt template for each component type', () => {
      const componentTypes: ComponentType[] = [
        'USER_ACTION', 'CLIENT_CODE', 'FIREWALL', 'WAF', 'LOAD_BALANCER',
        'API_GATEWAY', 'API_ENDPOINT', 'BACKEND_LOGIC', 'DATABASE',
        'EVENT_HANDLER', 'VIEW_UPDATE'
      ];

      for (const type of componentTypes) {
        const prompt = engine.getPromptTemplate(type);
        expect(prompt).toBeTruthy();
        expect(prompt.length).toBeGreaterThan(50);
        expect(prompt).toContain('JSON format');
      }
    });
  });

  describe('getComponentKeywords', () => {
    it('should return keywords for each component type', () => {
      const keywords = engine.getComponentKeywords('DATABASE');

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('database');
      expect(keywords).toContain('sql');
    });

    it('should have distinct keywords per component', () => {
      const userKeywords = engine.getComponentKeywords('USER_ACTION');
      const dbKeywords = engine.getComponentKeywords('DATABASE');

      // These should have different primary keywords
      expect(userKeywords).toContain('user');
      expect(userKeywords).toContain('click');
      expect(dbKeywords).not.toContain('click');
    });
  });
});
