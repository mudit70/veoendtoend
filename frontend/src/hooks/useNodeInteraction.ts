import { useCallback, useState, useRef } from 'react';
import type { Node, NodeChange, NodePositionChange } from '@xyflow/react';
import type { BaseNodeData } from '../components/nodes/BaseNode';

export interface NodeInteractionState {
  selectedNodeId: string | null;
  selectedNodes: string[];
  draggedNodeId: string | null;
  positionChanges: Map<string, { x: number; y: number }>;
  hasUnsavedChanges: boolean;
}

export interface UseNodeInteractionOptions {
  onNodeSelect?: (nodeId: string | null) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onPositionChange?: (nodeId: string, position: { x: number; y: number }) => void;
  onUnsavedChangesUpdate?: (hasChanges: boolean) => void;
}

export function useNodeInteraction(
  initialNodes: Node<BaseNodeData>[],
  options: UseNodeInteractionOptions = {}
) {
  const { onNodeSelect, onNodeDoubleClick, onPositionChange, onUnsavedChangesUpdate } = options;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [positionChanges, setPositionChanges] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );

  const originalPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Initialize original positions
  if (originalPositions.current.size === 0 && initialNodes.length > 0) {
    initialNodes.forEach((node) => {
      originalPositions.current.set(node.id, { ...node.position });
    });
  }

  const hasUnsavedChanges = positionChanges.size > 0;

  // Handle node selection
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      setSelectedNodeId(node.id);

      // Multi-select with Ctrl/Cmd
      if (event.ctrlKey || event.metaKey) {
        setSelectedNodes((prev) => {
          if (prev.includes(node.id)) {
            return prev.filter((id) => id !== node.id);
          }
          return [...prev, node.id];
        });
      } else {
        setSelectedNodes([node.id]);
      }

      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  // Handle double-click to open edit modal
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      onNodeDoubleClick?.(node.id);
    },
    [onNodeDoubleClick]
  );

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodes([]);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Handle node drag start
  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    setDraggedNodeId(node.id);
  }, []);

  // Handle node drag stop
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setDraggedNodeId(null);

      const originalPos = originalPositions.current.get(node.id);
      if (originalPos) {
        const hasMoved =
          Math.abs(originalPos.x - node.position.x) > 1 ||
          Math.abs(originalPos.y - node.position.y) > 1;

        if (hasMoved) {
          setPositionChanges((prev) => {
            const newChanges = new Map(prev);
            newChanges.set(node.id, { ...node.position });
            return newChanges;
          });
          onPositionChange?.(node.id, node.position);
          onUnsavedChangesUpdate?.(true);
        }
      }
    },
    [onPositionChange, onUnsavedChangesUpdate]
  );

  // Handle nodes change from ReactFlow
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.dragging === false) {
          const posChange = change as NodePositionChange;
          if (posChange.position) {
            const originalPos = originalPositions.current.get(posChange.id);
            if (originalPos) {
              const hasMoved =
                Math.abs(originalPos.x - posChange.position.x) > 1 ||
                Math.abs(originalPos.y - posChange.position.y) > 1;

              if (hasMoved) {
                setPositionChanges((prev) => {
                  const newChanges = new Map(prev);
                  newChanges.set(posChange.id, { ...posChange.position! });
                  return newChanges;
                });
              }
            }
          }
        }
      });
    },
    []
  );

  // Reset position for a single node
  const resetNodePosition = useCallback(
    (nodeId: string): { x: number; y: number } | null => {
      const originalPos = originalPositions.current.get(nodeId);
      if (originalPos) {
        setPositionChanges((prev) => {
          const newChanges = new Map(prev);
          newChanges.delete(nodeId);
          if (newChanges.size === 0) {
            onUnsavedChangesUpdate?.(false);
          }
          return newChanges;
        });
        return originalPos;
      }
      return null;
    },
    [onUnsavedChangesUpdate]
  );

  // Reset all positions
  const resetAllPositions = useCallback((): Map<string, { x: number; y: number }> => {
    const positions = new Map(originalPositions.current);
    setPositionChanges(new Map());
    onUnsavedChangesUpdate?.(false);
    return positions;
  }, [onUnsavedChangesUpdate]);

  // Clear unsaved changes (after save)
  const clearPositionChanges = useCallback(() => {
    // Update original positions to current
    positionChanges.forEach((pos, nodeId) => {
      originalPositions.current.set(nodeId, pos);
    });
    setPositionChanges(new Map());
    onUnsavedChangesUpdate?.(false);
  }, [positionChanges, onUnsavedChangesUpdate]);

  // Get current state
  const getState = useCallback((): NodeInteractionState => {
    return {
      selectedNodeId,
      selectedNodes,
      draggedNodeId,
      positionChanges,
      hasUnsavedChanges,
    };
  }, [selectedNodeId, selectedNodes, draggedNodeId, positionChanges, hasUnsavedChanges]);

  return {
    // State
    selectedNodeId,
    selectedNodes,
    draggedNodeId,
    positionChanges,
    hasUnsavedChanges,

    // Handlers
    handleNodeClick,
    handleNodeDoubleClick,
    handlePaneClick,
    handleNodeDragStart,
    handleNodeDragStop,
    handleNodesChange,

    // Actions
    resetNodePosition,
    resetAllPositions,
    clearPositionChanges,
    getState,

    // Setters
    setSelectedNodeId,
    setSelectedNodes,
  };
}

export default useNodeInteraction;
