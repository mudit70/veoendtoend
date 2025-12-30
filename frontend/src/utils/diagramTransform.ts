import type { Node, Edge } from '@xyflow/react';
import type {
  Diagram,
  DiagramComponent,
  DiagramEdge,
  ComponentType,
} from '@veoendtoend/shared';
import type { BaseNodeData } from '../components/nodes/BaseNode';

// Map component types to ReactFlow node types
const componentTypeToNodeType: Record<ComponentType, string> = {
  USER_ACTION: 'userAction',
  CLIENT_CODE: 'clientCode',
  FIREWALL: 'firewall',
  WAF: 'waf',
  LOAD_BALANCER: 'loadBalancer',
  API_GATEWAY: 'apiGateway',
  API_ENDPOINT: 'apiEndpoint',
  BACKEND_LOGIC: 'backendLogic',
  DATABASE: 'database',
  EVENT_HANDLER: 'eventHandler',
  VIEW_UPDATE: 'viewUpdate',
};

// Map ReactFlow node types back to component types
const nodeTypeToComponentType: Record<string, ComponentType> = Object.entries(
  componentTypeToNodeType
).reduce((acc, [key, value]) => {
  acc[value] = key as ComponentType;
  return acc;
}, {} as Record<string, ComponentType>);

/**
 * Transform API diagram data to ReactFlow nodes and edges
 */
export function transformApiToReactFlow(
  diagram: Diagram,
  components: DiagramComponent[],
  edges: DiagramEdge[]
): { nodes: Node<BaseNodeData>[]; edges: Edge[] } {
  // Transform components to nodes
  const nodes: Node<BaseNodeData>[] = components.map((component) => ({
    id: component.id,
    type: componentTypeToNodeType[component.componentType] || 'default',
    position: component.position,
    data: {
      title: component.title,
      description: component.description,
      status: component.status,
      confidence: component.confidence,
      sourceExcerpt: component.sourceExcerpt,
      isUserModified: component.isUserModified,
      componentType: component.componentType,
    },
    draggable: true,
    selectable: true,
  }));

  // Transform edges
  const reactFlowEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceComponentId,
    target: edge.targetComponentId,
    type: edge.edgeType === 'REQUEST' ? 'request' : 'response',
    label: edge.label,
    data: {
      edgeType: edge.edgeType,
      label: edge.label,
    },
    markerEnd: {
      type: 'arrowclosed' as const,
      color: edge.edgeType === 'REQUEST' ? '#10b981' : '#6366f1',
    },
  }));

  return { nodes, edges: reactFlowEdges };
}

/**
 * Transform ReactFlow nodes back to API component updates
 */
export function transformReactFlowToApi(nodes: Node<BaseNodeData>[]): {
  componentUpdates: Array<{
    id: string;
    position: { x: number; y: number };
    title?: string;
    description?: string;
  }>;
} {
  const componentUpdates = nodes.map((node) => ({
    id: node.id,
    position: node.position,
    title: node.data?.title,
    description: node.data?.description,
  }));

  return { componentUpdates };
}

/**
 * Extract viewport state from ReactFlow
 */
export function extractViewportState(viewport: {
  x: number;
  y: number;
  zoom: number;
}): { x: number; y: number; zoom: number } {
  return {
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
  };
}

/**
 * Create initial viewport state for a set of nodes
 */
export function calculateInitialViewport(nodes: Node[]): {
  x: number;
  y: number;
  zoom: number;
} {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 200); // Approximate node width
    maxY = Math.max(maxY, node.position.y + 100); // Approximate node height
  });

  // Center the viewport
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: -centerX + 400, // Offset to center in typical viewport
    y: -centerY + 200,
    zoom: 1,
  };
}

/**
 * Get node type string from component type
 */
export function getNodeType(componentType: ComponentType): string {
  return componentTypeToNodeType[componentType] || 'default';
}

/**
 * Get component type from node type string
 */
export function getComponentType(nodeType: string): ComponentType | undefined {
  return nodeTypeToComponentType[nodeType];
}

/**
 * Check if a node position has changed
 */
export function hasPositionChanged(
  original: { x: number; y: number },
  current: { x: number; y: number },
  threshold = 1
): boolean {
  return (
    Math.abs(original.x - current.x) > threshold ||
    Math.abs(original.y - current.y) > threshold
  );
}

/**
 * Group nodes by their component type for layout purposes
 */
export function groupNodesByType(
  nodes: Node<BaseNodeData>[]
): Map<string, Node<BaseNodeData>[]> {
  const groups = new Map<string, Node<BaseNodeData>[]>();

  nodes.forEach((node) => {
    const type = node.type || 'default';
    const group = groups.get(type) || [];
    group.push(node);
    groups.set(type, group);
  });

  return groups;
}

/**
 * Find security layer nodes
 */
export function getSecurityLayerNodes(
  nodes: Node<BaseNodeData>[]
): Node<BaseNodeData>[] {
  const securityTypes = ['firewall', 'waf', 'loadBalancer', 'apiGateway'];
  return nodes.filter((node) => securityTypes.includes(node.type || ''));
}
