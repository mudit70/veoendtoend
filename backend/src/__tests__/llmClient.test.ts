import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMClient } from '../services/llmClient.js';

describe('LLMClient', () => {
  describe('isConfigured', () => {
    it('should return false when no API key is provided', () => {
      const client = new LLMClient({ apiKey: '' });
      expect(client.isConfigured()).toBe(false);
    });

    it('should return true when API key is provided', () => {
      const client = new LLMClient({ apiKey: 'test-api-key' });
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('parseDiscoveryResponse', () => {
    it('should parse valid JSON response', () => {
      const client = new LLMClient();
      const response = `Here's the analysis:
{
  "operations": [
    {
      "name": "User Login",
      "description": "Authenticates users",
      "type": "USER_INTERACTION",
      "confidence": 0.9,
      "sourceReferences": ["login page", "auth endpoint"]
    }
  ],
  "summary": "A simple auth system"
}`;

      const result = client.parseDiscoveryResponse(response);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].name).toBe('User Login');
      expect(result.operations[0].type).toBe('USER_INTERACTION');
      expect(result.operations[0].confidence).toBe(0.9);
      expect(result.summary).toBe('A simple auth system');
    });

    it('should handle response with only JSON', () => {
      const client = new LLMClient();
      const response = `{
  "operations": [
    {
      "name": "API Call",
      "description": "Fetches data",
      "type": "API_CALL",
      "confidence": 0.85,
      "sourceReferences": []
    }
  ],
  "summary": "API operations"
}`;

      const result = client.parseDiscoveryResponse(response);

      expect(result.operations).toHaveLength(1);
      expect(result.operations[0].name).toBe('API Call');
      expect(result.operations[0].type).toBe('API_CALL');
    });

    it('should normalize invalid operation types to API_CALL', () => {
      const client = new LLMClient();
      const response = `{
  "operations": [
    {
      "name": "Unknown Type Op",
      "description": "Has invalid type",
      "type": "INVALID_TYPE",
      "confidence": 0.5,
      "sourceReferences": []
    }
  ],
  "summary": "Test"
}`;

      const result = client.parseDiscoveryResponse(response);

      expect(result.operations[0].type).toBe('API_CALL');
    });

    it('should clamp confidence to 0-1 range', () => {
      const client = new LLMClient();
      const response = `{
  "operations": [
    {
      "name": "High Confidence",
      "description": "Too confident",
      "type": "API_CALL",
      "confidence": 1.5,
      "sourceReferences": []
    },
    {
      "name": "Low Confidence",
      "description": "Too low",
      "type": "API_CALL",
      "confidence": -0.5,
      "sourceReferences": []
    }
  ],
  "summary": "Test"
}`;

      const result = client.parseDiscoveryResponse(response);

      expect(result.operations[0].confidence).toBe(1);
      expect(result.operations[1].confidence).toBe(0);
    });

    it('should throw error when no JSON found', () => {
      const client = new LLMClient();
      const response = 'Just plain text without JSON';

      expect(() => client.parseDiscoveryResponse(response)).toThrow('No JSON found');
    });

    it('should throw error when operations array is missing', () => {
      const client = new LLMClient();
      const response = '{ "summary": "No operations" }';

      expect(() => client.parseDiscoveryResponse(response)).toThrow('missing operations array');
    });

    it('should handle missing optional fields', () => {
      const client = new LLMClient();
      const response = `{
  "operations": [
    {
      "name": "Minimal Op"
    }
  ]
}`;

      const result = client.parseDiscoveryResponse(response);

      expect(result.operations[0].name).toBe('Minimal Op');
      expect(result.operations[0].description).toBe('');
      expect(result.operations[0].type).toBe('API_CALL');
      expect(result.operations[0].confidence).toBe(0.5);
      expect(result.operations[0].sourceReferences).toEqual([]);
      expect(result.summary).toBe('No summary provided');
    });

    it('should parse multiple operations', () => {
      const client = new LLMClient();
      const response = `{
  "operations": [
    {
      "name": "Op 1",
      "description": "First op",
      "type": "USER_INTERACTION",
      "confidence": 0.9,
      "sourceReferences": ["ref1"]
    },
    {
      "name": "Op 2",
      "description": "Second op",
      "type": "CLIENT_OPERATION",
      "confidence": 0.8,
      "sourceReferences": ["ref2", "ref3"]
    },
    {
      "name": "Op 3",
      "description": "Third op",
      "type": "DATA_FLOW",
      "confidence": 0.7,
      "sourceReferences": []
    }
  ],
  "summary": "Three operations discovered"
}`;

      const result = client.parseDiscoveryResponse(response);

      expect(result.operations).toHaveLength(3);
      expect(result.operations[0].type).toBe('USER_INTERACTION');
      expect(result.operations[1].type).toBe('CLIENT_OPERATION');
      expect(result.operations[2].type).toBe('DATA_FLOW');
    });
  });

  describe('getMockDiscoveryResult', () => {
    it('should return mock data with operations', () => {
      const client = new LLMClient();
      const result = client.getMockDiscoveryResult();

      expect(result.operations).toBeDefined();
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.summary).toContain('Mock');
    });

    it('should return valid operation structures', () => {
      const client = new LLMClient();
      const result = client.getMockDiscoveryResult();

      for (const op of result.operations) {
        expect(op.name).toBeDefined();
        expect(op.description).toBeDefined();
        expect(['USER_INTERACTION', 'CLIENT_OPERATION', 'API_CALL', 'DATA_FLOW']).toContain(op.type);
        expect(op.confidence).toBeGreaterThanOrEqual(0);
        expect(op.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(op.sourceReferences)).toBe(true);
      }
    });
  });

  describe('discoverOperations', () => {
    it('should return mock result when not configured', async () => {
      const client = new LLMClient({ apiKey: '' });
      const documents = [{ filename: 'test.md', content: 'Test content' }];

      const result = await client.discoverOperations(documents);

      expect(result.operations).toBeDefined();
      expect(result.summary).toContain('Mock');
    });
  });
});
