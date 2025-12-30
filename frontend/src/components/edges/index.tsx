import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export interface CustomEdgeData {
  label?: string;
  edgeType: 'REQUEST' | 'RESPONSE';
  animated?: boolean;
}

// Request Edge - solid line with arrow
export const RequestEdge = memo(function RequestEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as CustomEdgeData | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#3b82f6' : '#10b981',
          strokeWidth: selected ? 3 : 2,
        }}
        className={edgeData?.animated ? 'animated-edge' : ''}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="edge-label px-2 py-0.5 bg-white border border-green-200 rounded text-xs text-green-700 shadow-sm"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// Response Edge - dashed line with arrow
export const ResponseEdge = memo(function ResponseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as CustomEdgeData | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#3b82f6' : '#6366f1',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: '5,5',
        }}
        className={edgeData?.animated ? 'animated-edge' : ''}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="edge-label px-2 py-0.5 bg-white border border-indigo-200 rounded text-xs text-indigo-700 shadow-sm"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// Animated edge styles (to be added to global CSS)
export const edgeStyles = `
  .animated-edge {
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }

  .edge-label {
    font-size: 10px;
    white-space: nowrap;
  }
`;

// Export edge types for ReactFlow registration
export const edgeTypes = {
  request: RequestEdge,
  response: ResponseEdge,
};

// Helper function to create edge with proper styling
export function createEdge(
  id: string,
  source: string,
  target: string,
  type: 'REQUEST' | 'RESPONSE',
  label?: string,
  animated = false
) {
  return {
    id,
    source,
    target,
    type: type === 'REQUEST' ? 'request' : 'response',
    data: {
      label,
      edgeType: type,
      animated,
    },
    markerEnd: {
      type: 'arrowclosed' as const,
      color: type === 'REQUEST' ? '#10b981' : '#6366f1',
    },
  };
}
