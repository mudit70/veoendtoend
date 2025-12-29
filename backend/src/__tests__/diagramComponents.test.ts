import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiagramService } from '../services/diagramService';
import type { ComponentType, DiagramComponent, DiagramEdge } from '@veoendtoend/shared';

// Mock the database
vi.mock('../database', () => ({
  db: {
    getOperationById: vi.fn((id: string) => {
      if (id === 'op-1') {
        return {
          id: 'op-1',
          projectId: 'project-1',
          name: 'Test Operation',
          description: 'Test description',
          type: 'API_CALL',
          status: 'CONFIRMED',
          confidence: 0.9,
          sourceDocumentIds: ['doc-1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }),
    getDocumentsByProjectId: vi.fn(() => [
      {
        id: 'doc-1',
        projectId: 'project-1',
        filename: 'test.txt',
        content: 'User clicks button, frontend React code calls POST /api/endpoint. Backend service queries database.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  },
}));

describe('Diagram Components & Edges', () => {
  let service: DiagramService;

  beforeEach(() => {
    service = new DiagramService();
  });

  describe('Component Definitions', () => {
    const expectedComponents: ComponentType[] = [
      'USER_ACTION',
      'CLIENT_CODE',
      'FIREWALL',
      'WAF',
      'LOAD_BALANCER',
      'API_GATEWAY',
      'API_ENDPOINT',
      'BACKEND_LOGIC',
      'DATABASE',
      'EVENT_HANDLER',
      'VIEW_UPDATE',
    ];

    it('should create all 11 template components', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      expect(diagram).not.toBeNull();
      expect(diagram!.components.length).toBe(11);

      // Verify all component types are present
      const componentTypes = diagram!.components.map(c => c.componentType);
      for (const expectedType of expectedComponents) {
        expect(componentTypes).toContain(expectedType);
      }
    });

    it('should assign unique positions to each component', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      const positions = diagram!.components.map(c => `${c.position.x},${c.position.y}`);
      const uniquePositions = new Set(positions);

      expect(uniquePositions.size).toBe(11);
    });

    it('should have valid position coordinates for all components', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      for (const component of diagram!.components) {
        expect(typeof component.position.x).toBe('number');
        expect(typeof component.position.y).toBe('number');
        expect(component.position.x).toBeGreaterThanOrEqual(0);
        expect(component.position.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('should follow horizontal layout for main flow components', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      const mainFlowTypes: ComponentType[] = [
        'USER_ACTION', 'CLIENT_CODE', 'FIREWALL', 'WAF',
        'LOAD_BALANCER', 'API_GATEWAY', 'API_ENDPOINT',
        'BACKEND_LOGIC', 'DATABASE'
      ];

      const mainFlowComponents = diagram!.components
        .filter(c => mainFlowTypes.includes(c.componentType))
        .sort((a, b) => a.position.x - b.position.x);

      // Each subsequent component should be to the right
      for (let i = 1; i < mainFlowComponents.length; i++) {
        expect(mainFlowComponents[i].position.x).toBeGreaterThan(
          mainFlowComponents[i - 1].position.x
        );
      }
    });
  });

  describe('Edge Definitions', () => {
    it('should create edges between components', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      expect(diagram!.edges.length).toBeGreaterThan(0);
    });

    it('should have valid source and target component IDs', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      const componentIds = new Set(diagram!.components.map(c => c.id));

      for (const edge of diagram!.edges) {
        expect(componentIds.has(edge.sourceComponentId)).toBe(true);
        expect(componentIds.has(edge.targetComponentId)).toBe(true);
      }
    });

    it('should have request and response edge types', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      const edgeTypes = diagram!.edges.map(e => e.edgeType);

      expect(edgeTypes).toContain('REQUEST');
      expect(edgeTypes).toContain('RESPONSE');
    });

    it('should have labels on edges', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);
      const edgesWithLabels = diagram!.edges.filter(e => e.label);

      expect(edgesWithLabels.length).toBeGreaterThan(0);
    });

    it('should create request flow from user to database', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);

      // Find component IDs
      const getComponentId = (type: ComponentType) =>
        diagram!.components.find(c => c.componentType === type)?.id;

      const userActionId = getComponentId('USER_ACTION');
      const clientCodeId = getComponentId('CLIENT_CODE');

      // There should be an edge from USER_ACTION to CLIENT_CODE
      const userToClientEdge = diagram!.edges.find(
        e => e.sourceComponentId === userActionId && e.targetComponentId === clientCodeId
      );
      expect(userToClientEdge).toBeDefined();
      expect(userToClientEdge!.edgeType).toBe('REQUEST');
    });

    it('should create response flow back to client', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);

      // Find component IDs
      const getComponentId = (type: ComponentType) =>
        diagram!.components.find(c => c.componentType === type)?.id;

      const databaseId = getComponentId('DATABASE');
      const backendId = getComponentId('BACKEND_LOGIC');

      // There should be a response edge from DATABASE to BACKEND_LOGIC
      const dbToBackendEdge = diagram!.edges.find(
        e => e.sourceComponentId === databaseId &&
             e.targetComponentId === backendId &&
             e.edgeType === 'RESPONSE'
      );
      expect(dbToBackendEdge).toBeDefined();
    });
  });

  describe('Component Status', () => {
    it('should set status based on data availability', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);

      for (const component of diagram!.components) {
        expect(['POPULATED', 'GREYED_OUT', 'USER_MODIFIED']).toContain(component.status);
      }
    });

    it('should have confidence scores', async () => {
      const job = await service.startDiagramGeneration('op-1');
      await new Promise(resolve => setTimeout(resolve, 800));

      const diagram = service.getDiagram(job.diagramId);

      for (const component of diagram!.components) {
        expect(typeof component.confidence).toBe('number');
        expect(component.confidence).toBeGreaterThanOrEqual(0);
        expect(component.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
