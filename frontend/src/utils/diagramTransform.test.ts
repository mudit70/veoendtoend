import { describe, it, expect } from 'vitest';
import type { Diagram, DiagramComponent, DiagramEdge } from '@veoendtoend/shared';
import type { Node } from '@xyflow/react';
import type { BaseNodeData } from '../components/nodes/BaseNode';
import {
  transformApiToReactFlow,
  transformReactFlowToApi,
  extractViewportState,
  calculateInitialViewport,
  getNodeType,
  getComponentType,
  hasPositionChanged,
  groupNodesByType,
  getSecurityLayerNodes,
} from './diagramTransform';

const mockDiagram: Diagram = {
  id: 'diagram-1',
  operationId: 'op-1',
  name: 'Test Diagram',
  status: 'COMPLETED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockComponents: DiagramComponent[] = [
  {
    id: 'comp-1',
    diagramId: 'diagram-1',
    componentType: 'USER_ACTION',
    title: 'User Action',
    description: 'User clicks button',
    status: 'POPULATED',
    confidence: 0.9,
    position: { x: 100, y: 100 },
    isUserModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'comp-2',
    diagramId: 'diagram-1',
    componentType: 'CLIENT_CODE',
    title: 'Client Code',
    description: 'Frontend handler',
    status: 'POPULATED',
    confidence: 0.85,
    sourceExcerpt: 'function handleClick()',
    position: { x: 250, y: 100 },
    isUserModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'comp-3',
    diagramId: 'diagram-1',
    componentType: 'FIREWALL',
    title: 'Firewall',
    description: 'Network security',
    status: 'GREYED_OUT',
    confidence: 0,
    position: { x: 400, y: 100 },
    isUserModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockEdges: DiagramEdge[] = [
  {
    id: 'edge-1',
    diagramId: 'diagram-1',
    sourceComponentId: 'comp-1',
    targetComponentId: 'comp-2',
    edgeType: 'REQUEST',
    label: 'triggers',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'edge-2',
    diagramId: 'diagram-1',
    sourceComponentId: 'comp-2',
    targetComponentId: 'comp-1',
    edgeType: 'RESPONSE',
    label: 'updates',
    createdAt: new Date().toISOString(),
  },
];

describe('transformApiToReactFlow', () => {
  it('should transform API data to ReactFlow nodes', () => {
    const { nodes } = transformApiToReactFlow(mockDiagram, mockComponents, mockEdges);

    expect(nodes).toHaveLength(3);
    expect(nodes[0].id).toBe('comp-1');
    expect(nodes[0].type).toBe('userAction');
    expect(nodes[0].position).toEqual({ x: 100, y: 100 });
  });

  it('should transform API data to ReactFlow edges', () => {
    const { edges } = transformApiToReactFlow(mockDiagram, mockComponents, mockEdges);

    expect(edges).toHaveLength(2);
    expect(edges[0].id).toBe('edge-1');
    expect(edges[0].source).toBe('comp-1');
    expect(edges[0].target).toBe('comp-2');
    expect(edges[0].type).toBe('request');
  });

  it('should set correct edge types', () => {
    const { edges } = transformApiToReactFlow(mockDiagram, mockComponents, mockEdges);

    expect(edges[0].type).toBe('request');
    expect(edges[1].type).toBe('response');
  });

  it('should include node data properties', () => {
    const { nodes } = transformApiToReactFlow(mockDiagram, mockComponents, mockEdges);

    expect(nodes[0].data.title).toBe('User Action');
    expect(nodes[0].data.description).toBe('User clicks button');
    expect(nodes[0].data.status).toBe('POPULATED');
    expect(nodes[0].data.confidence).toBe(0.9);
  });

  it('should include source excerpt when available', () => {
    const { nodes } = transformApiToReactFlow(mockDiagram, mockComponents, mockEdges);

    expect(nodes[1].data.sourceExcerpt).toBe('function handleClick()');
    expect(nodes[0].data.sourceExcerpt).toBeUndefined();
  });
});

describe('transformReactFlowToApi', () => {
  it('should transform ReactFlow nodes back to API format', () => {
    const nodes: Node<BaseNodeData>[] = [
      {
        id: 'comp-1',
        type: 'userAction',
        position: { x: 150, y: 120 },
        data: {
          title: 'Updated Title',
          description: 'Updated description',
          status: 'POPULATED',
          confidence: 0.9,
          isUserModified: true,
          componentType: 'USER_ACTION',
        },
      },
    ];

    const { componentUpdates } = transformReactFlowToApi(nodes);

    expect(componentUpdates).toHaveLength(1);
    expect(componentUpdates[0].id).toBe('comp-1');
    expect(componentUpdates[0].position).toEqual({ x: 150, y: 120 });
    expect(componentUpdates[0].title).toBe('Updated Title');
  });
});

describe('extractViewportState', () => {
  it('should extract viewport state', () => {
    const viewport = { x: 100, y: 200, zoom: 1.5 };
    const result = extractViewportState(viewport);

    expect(result).toEqual({ x: 100, y: 200, zoom: 1.5 });
  });
});

describe('calculateInitialViewport', () => {
  it('should return default viewport for empty nodes', () => {
    const result = calculateInitialViewport([]);

    expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('should calculate centered viewport for nodes', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 400, y: 200 }, data: {} },
    ];

    const result = calculateInitialViewport(nodes);

    expect(result.zoom).toBe(1);
    expect(typeof result.x).toBe('number');
    expect(typeof result.y).toBe('number');
  });
});

describe('getNodeType', () => {
  it('should return correct node type for component type', () => {
    expect(getNodeType('USER_ACTION')).toBe('userAction');
    expect(getNodeType('CLIENT_CODE')).toBe('clientCode');
    expect(getNodeType('FIREWALL')).toBe('firewall');
    expect(getNodeType('DATABASE')).toBe('database');
  });
});

describe('getComponentType', () => {
  it('should return correct component type for node type', () => {
    expect(getComponentType('userAction')).toBe('USER_ACTION');
    expect(getComponentType('clientCode')).toBe('CLIENT_CODE');
    expect(getComponentType('firewall')).toBe('FIREWALL');
  });

  it('should return undefined for unknown node type', () => {
    expect(getComponentType('unknown')).toBeUndefined();
  });
});

describe('hasPositionChanged', () => {
  it('should return false for same position', () => {
    const result = hasPositionChanged({ x: 100, y: 100 }, { x: 100, y: 100 });
    expect(result).toBe(false);
  });

  it('should return true for changed position', () => {
    const result = hasPositionChanged({ x: 100, y: 100 }, { x: 150, y: 100 });
    expect(result).toBe(true);
  });

  it('should use threshold for small changes', () => {
    const result = hasPositionChanged({ x: 100, y: 100 }, { x: 100.5, y: 100 });
    expect(result).toBe(false);
  });
});

describe('groupNodesByType', () => {
  it('should group nodes by their type', () => {
    const nodes: Node<BaseNodeData>[] = [
      { id: '1', type: 'userAction', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
      { id: '2', type: 'userAction', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
      { id: '3', type: 'database', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
    ];

    const groups = groupNodesByType(nodes);

    expect(groups.get('userAction')).toHaveLength(2);
    expect(groups.get('database')).toHaveLength(1);
  });
});

describe('getSecurityLayerNodes', () => {
  it('should return only security layer nodes', () => {
    const nodes: Node<BaseNodeData>[] = [
      { id: '1', type: 'userAction', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
      { id: '2', type: 'firewall', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
      { id: '3', type: 'waf', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
      { id: '4', type: 'database', position: { x: 0, y: 0 }, data: {} as BaseNodeData },
    ];

    const securityNodes = getSecurityLayerNodes(nodes);

    expect(securityNodes).toHaveLength(2);
    expect(securityNodes.map(n => n.type)).toEqual(['firewall', 'waf']);
  });
});
