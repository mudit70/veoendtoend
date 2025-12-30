import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNodeInteraction } from './useNodeInteraction';
import type { Node } from '@xyflow/react';
import type { BaseNodeData } from '../components/nodes/BaseNode';

const createMockNodes = (): Node<BaseNodeData>[] => [
  {
    id: 'node-1',
    type: 'userAction',
    position: { x: 100, y: 100 },
    data: {
      title: 'User Action',
      description: 'Test node',
      status: 'POPULATED',
      confidence: 0.9,
      isUserModified: false,
      componentType: 'USER_ACTION',
    },
  },
  {
    id: 'node-2',
    type: 'clientCode',
    position: { x: 250, y: 100 },
    data: {
      title: 'Client Code',
      description: 'Test node 2',
      status: 'POPULATED',
      confidence: 0.85,
      isUserModified: false,
      componentType: 'CLIENT_CODE',
    },
  },
];

describe('useNodeInteraction', () => {
  describe('node selection', () => {
    it('should select node on click', () => {
      const onNodeSelect = vi.fn();
      const { result } = renderHook(() =>
        useNodeInteraction(createMockNodes(), { onNodeSelect })
      );

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
      const mockNode = { id: 'node-1' } as Node;

      act(() => {
        result.current.handleNodeClick(mockEvent, mockNode);
      });

      expect(result.current.selectedNodeId).toBe('node-1');
      expect(result.current.selectedNodes).toEqual(['node-1']);
      expect(onNodeSelect).toHaveBeenCalledWith('node-1');
    });

    it('should deselect on pane click', () => {
      const onNodeSelect = vi.fn();
      const { result } = renderHook(() =>
        useNodeInteraction(createMockNodes(), { onNodeSelect })
      );

      // First select a node
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
      act(() => {
        result.current.handleNodeClick(mockEvent, { id: 'node-1' } as Node);
      });

      expect(result.current.selectedNodeId).toBe('node-1');

      // Then click pane
      act(() => {
        result.current.handlePaneClick();
      });

      expect(result.current.selectedNodeId).toBeNull();
      expect(result.current.selectedNodes).toEqual([]);
      expect(onNodeSelect).toHaveBeenLastCalledWith(null);
    });

    it('should support multi-select with ctrl key', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      const mockEvent = {
        stopPropagation: vi.fn(),
        ctrlKey: true,
        metaKey: false,
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleNodeClick(mockEvent, { id: 'node-1' } as Node);
      });

      act(() => {
        result.current.handleNodeClick(mockEvent, { id: 'node-2' } as Node);
      });

      expect(result.current.selectedNodes).toContain('node-1');
      expect(result.current.selectedNodes).toContain('node-2');
    });

    it('should toggle selection with ctrl key', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      const mockEvent = {
        stopPropagation: vi.fn(),
        ctrlKey: true,
        metaKey: false,
      } as unknown as React.MouseEvent;

      // Select node-1
      act(() => {
        result.current.handleNodeClick(mockEvent, { id: 'node-1' } as Node);
      });

      expect(result.current.selectedNodes).toContain('node-1');

      // Deselect node-1
      act(() => {
        result.current.handleNodeClick(mockEvent, { id: 'node-1' } as Node);
      });

      expect(result.current.selectedNodes).not.toContain('node-1');
    });
  });

  describe('node double-click', () => {
    it('should call onNodeDoubleClick', () => {
      const onNodeDoubleClick = vi.fn();
      const { result } = renderHook(() =>
        useNodeInteraction(createMockNodes(), { onNodeDoubleClick })
      );

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

      act(() => {
        result.current.handleNodeDoubleClick(mockEvent, { id: 'node-1' } as Node);
      });

      expect(onNodeDoubleClick).toHaveBeenCalledWith('node-1');
    });
  });

  describe('node dragging', () => {
    it('should track dragged node', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      const mockEvent = {} as React.MouseEvent;

      act(() => {
        result.current.handleNodeDragStart(mockEvent, { id: 'node-1' } as Node);
      });

      expect(result.current.draggedNodeId).toBe('node-1');
    });

    it('should track position changes after drag', () => {
      const onPositionChange = vi.fn();
      const { result } = renderHook(() =>
        useNodeInteraction(createMockNodes(), { onPositionChange })
      );

      const mockEvent = {} as React.MouseEvent;
      const draggedNode = {
        id: 'node-1',
        position: { x: 200, y: 150 },
      } as Node;

      act(() => {
        result.current.handleNodeDragStart(mockEvent, { id: 'node-1' } as Node);
      });

      act(() => {
        result.current.handleNodeDragStop(mockEvent, draggedNode);
      });

      expect(result.current.draggedNodeId).toBeNull();
      expect(result.current.positionChanges.has('node-1')).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(onPositionChange).toHaveBeenCalledWith('node-1', { x: 200, y: 150 });
    });
  });

  describe('position reset', () => {
    it('should reset single node position', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      // Simulate drag
      const mockEvent = {} as React.MouseEvent;
      act(() => {
        result.current.handleNodeDragStop(mockEvent, {
          id: 'node-1',
          position: { x: 200, y: 150 },
        } as Node);
      });

      expect(result.current.positionChanges.has('node-1')).toBe(true);

      // Reset
      let originalPos: { x: number; y: number } | null = null;
      act(() => {
        originalPos = result.current.resetNodePosition('node-1');
      });

      expect(originalPos).toEqual({ x: 100, y: 100 });
      expect(result.current.positionChanges.has('node-1')).toBe(false);
    });

    it('should reset all positions', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      const mockEvent = {} as React.MouseEvent;

      // Simulate multiple drags
      act(() => {
        result.current.handleNodeDragStop(mockEvent, {
          id: 'node-1',
          position: { x: 200, y: 150 },
        } as Node);
      });

      act(() => {
        result.current.handleNodeDragStop(mockEvent, {
          id: 'node-2',
          position: { x: 350, y: 200 },
        } as Node);
      });

      expect(result.current.positionChanges.size).toBe(2);

      // Reset all
      let positions: Map<string, { x: number; y: number }>;
      act(() => {
        positions = result.current.resetAllPositions();
      });

      expect(positions!.get('node-1')).toEqual({ x: 100, y: 100 });
      expect(positions!.get('node-2')).toEqual({ x: 250, y: 100 });
      expect(result.current.positionChanges.size).toBe(0);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('unsaved changes', () => {
    it('should track unsaved changes', () => {
      const onUnsavedChangesUpdate = vi.fn();
      const { result } = renderHook(() =>
        useNodeInteraction(createMockNodes(), { onUnsavedChangesUpdate })
      );

      expect(result.current.hasUnsavedChanges).toBe(false);

      const mockEvent = {} as React.MouseEvent;
      act(() => {
        result.current.handleNodeDragStop(mockEvent, {
          id: 'node-1',
          position: { x: 200, y: 150 },
        } as Node);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(onUnsavedChangesUpdate).toHaveBeenCalledWith(true);
    });

    it('should clear changes after save', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      const mockEvent = {} as React.MouseEvent;
      act(() => {
        result.current.handleNodeDragStop(mockEvent, {
          id: 'node-1',
          position: { x: 200, y: 150 },
        } as Node);
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      act(() => {
        result.current.clearPositionChanges();
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.positionChanges.size).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const { result } = renderHook(() => useNodeInteraction(createMockNodes()));

      const state = result.current.getState();

      expect(state).toHaveProperty('selectedNodeId');
      expect(state).toHaveProperty('selectedNodes');
      expect(state).toHaveProperty('draggedNodeId');
      expect(state).toHaveProperty('positionChanges');
      expect(state).toHaveProperty('hasUnsavedChanges');
    });
  });
});
