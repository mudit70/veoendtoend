import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface DiagramCanvasProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  viewportState?: { x: number; y: number; zoom: number };
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  fitView?: boolean;
  readOnly?: boolean;
}

export function DiagramCanvas({
  nodes: initialNodes,
  edges: initialEdges,
  nodeTypes,
  edgeTypes,
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onNodeClick,
  onEdgeClick,
  viewportState,
  onViewportChange,
  fitView = true,
  readOnly = false,
}: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external nodes/edges changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      externalOnNodesChange?.(changes);
    },
    [onNodesChange, externalOnNodesChange]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      externalOnEdgesChange?.(changes);
    },
    [onEdgesChange, externalOnEdgesChange]
  );

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      onViewportChange?.(viewport);
    },
    [onViewportChange]
  );

  const defaultViewport = useMemo(
    () => viewportState || { x: 0, y: 0, zoom: 1 },
    [viewportState]
  );

  const miniMapNodeColor = useCallback((node: Node) => {
    const statusColors: Record<string, string> = {
      POPULATED: '#10b981',
      GREYED_OUT: '#9ca3af',
      USER_MODIFIED: '#3b82f6',
    };
    return statusColors[node.data?.status as string] || '#6b7280';
  }, []);

  return (
    <div className="diagram-canvas" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={readOnly ? undefined : handleNodesChange}
        onEdgesChange={readOnly ? undefined : handleEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onMoveEnd={handleMoveEnd}
        defaultViewport={defaultViewport}
        fitView={fitView}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        elementsSelectable={!readOnly}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        selectNodesOnDrag={false}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={miniMapNodeColor}
          nodeStrokeWidth={2}
          zoomable
          pannable
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
          }}
        />
      </ReactFlow>
    </div>
  );
}

export default DiagramCanvas;
