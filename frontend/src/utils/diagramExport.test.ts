import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportToJson,
  parseJsonExport,
  generateFilename,
  type DiagramExportData,
} from './diagramExport';
import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from '../components/nodes/BaseNode';

describe('diagramExport utilities', () => {
  describe('generateFilename', () => {
    it('should convert to lowercase', () => {
      expect(generateFilename('My Diagram')).toBe('my-diagram');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateFilename('test diagram name')).toBe('test-diagram-name');
    });

    it('should remove special characters', () => {
      expect(generateFilename('test@diagram#name!')).toBe('test-diagram-name');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateFilename('---test---')).toBe('test');
    });

    it('should handle multiple consecutive spaces', () => {
      expect(generateFilename('test   diagram')).toBe('test-diagram');
    });

    it('should handle empty string', () => {
      expect(generateFilename('')).toBe('');
    });
  });

  describe('exportToJson', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      mockClick = vi.fn();

      // Save original URL methods if they exist
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;

      // Mock URL methods
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      URL.revokeObjectURL = vi.fn();

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: mockClick,
      } as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      // Restore original URL methods
      if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
      if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should create downloadable JSON file', () => {
      const nodes: Node<BaseNodeData>[] = [
        {
          id: 'node-1',
          type: 'userAction',
          position: { x: 100, y: 200 },
          data: {
            title: 'User Action',
            description: 'Test description',
            status: 'POPULATED',
            componentType: 'USER_ACTION',
            confidence: 0.85,
            isUserModified: false,
          },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          type: 'request',
          label: 'triggers',
        },
      ];

      exportToJson(nodes, edges, 'Test Diagram');

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('should include viewport in export', () => {
      const nodes: Node<BaseNodeData>[] = [];
      const edges: Edge[] = [];
      const viewport = { x: 100, y: 200, zoom: 1.5 };

      exportToJson(nodes, edges, 'Test', viewport);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('parseJsonExport', () => {
    it('should parse valid export data', () => {
      const validData: DiagramExportData = {
        metadata: {
          exportedAt: '2024-01-01T00:00:00Z',
          version: '1.0.0',
          name: 'Test Diagram',
        },
        nodes: [
          {
            id: 'node-1',
            type: 'userAction',
            position: { x: 0, y: 0 },
            data: { title: 'Test' },
          },
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
        ],
      };

      const result = parseJsonExport(JSON.stringify(validData));
      expect(result.metadata.name).toBe('Test Diagram');
      expect(result.nodes.length).toBe(1);
      expect(result.edges.length).toBe(1);
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseJsonExport('not valid json')).toThrow('Invalid JSON format');
    });

    it('should throw on missing metadata', () => {
      const data = { nodes: [], edges: [] };
      expect(() => parseJsonExport(JSON.stringify(data))).toThrow('missing required fields');
    });

    it('should throw on missing nodes', () => {
      const data = { metadata: {}, edges: [] };
      expect(() => parseJsonExport(JSON.stringify(data))).toThrow('missing required fields');
    });

    it('should throw on missing edges', () => {
      const data = { metadata: {}, nodes: [] };
      expect(() => parseJsonExport(JSON.stringify(data))).toThrow('missing required fields');
    });

    it('should throw if nodes is not an array', () => {
      const data = { metadata: {}, nodes: 'not array', edges: [] };
      expect(() => parseJsonExport(JSON.stringify(data))).toThrow('must be arrays');
    });

    it('should throw if edges is not an array', () => {
      const data = { metadata: {}, nodes: [], edges: 'not array' };
      expect(() => parseJsonExport(JSON.stringify(data))).toThrow('must be arrays');
    });

    it('should include viewport if present', () => {
      const validData: DiagramExportData = {
        metadata: {
          exportedAt: '2024-01-01T00:00:00Z',
          version: '1.0.0',
          name: 'Test',
        },
        nodes: [],
        edges: [],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      };

      const result = parseJsonExport(JSON.stringify(validData));
      expect(result.viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
    });
  });
});
