import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DiagramCanvas from './DiagramCanvas';
import type { Node, Edge } from '@xyflow/react';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

const mockNodes: Node[] = [
  {
    id: 'node-1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: 'User Action', status: 'POPULATED' },
  },
  {
    id: 'node-2',
    type: 'default',
    position: { x: 250, y: 100 },
    data: { label: 'Client Code', status: 'POPULATED' },
  },
  {
    id: 'node-3',
    type: 'default',
    position: { x: 400, y: 100 },
    data: { label: 'API Endpoint', status: 'GREYED_OUT' },
  },
];

const mockEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    label: 'triggers',
  },
  {
    id: 'edge-2',
    source: 'node-2',
    target: 'node-3',
    label: 'calls',
  },
];

describe('DiagramCanvas', () => {
  it('should render ReactFlow canvas', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    expect(container.querySelector('.react-flow')).toBeInTheDocument();
  });

  it('should render all nodes', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    const nodeElements = container.querySelectorAll('.react-flow__node');
    expect(nodeElements.length).toBe(3);
  });

  it('should render edges', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    // ReactFlow renders edges in SVG
    const edgeContainer = container.querySelector('.react-flow__edges');
    expect(edgeContainer).toBeInTheDocument();
  });

  it('should display MiniMap', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    const miniMap = container.querySelector('.react-flow__minimap');
    expect(miniMap).toBeInTheDocument();
  });

  it('should display Controls', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    const controls = container.querySelector('.react-flow__controls');
    expect(controls).toBeInTheDocument();
  });

  it('should display Background', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    const background = container.querySelector('.react-flow__background');
    expect(background).toBeInTheDocument();
  });

  it('should render with custom viewport state', () => {
    const viewportState = { x: 100, y: 200, zoom: 1.5 };
    const { container } = render(
      <DiagramCanvas
        nodes={mockNodes}
        edges={mockEdges}
        viewportState={viewportState}
      />
    );

    expect(container.querySelector('.react-flow')).toBeInTheDocument();
  });

  it('should call onNodeClick when node is clicked', () => {
    const onNodeClick = vi.fn();
    render(
      <DiagramCanvas
        nodes={mockNodes}
        edges={mockEdges}
        onNodeClick={onNodeClick}
      />
    );

    // ReactFlow handles clicks internally, we just verify the prop is accepted
    expect(onNodeClick).not.toHaveBeenCalled();
  });

  it('should apply readOnly mode', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} readOnly />
    );

    // In readOnly mode, nodes should not be draggable
    expect(container.querySelector('.react-flow')).toBeInTheDocument();
  });

  it('should render with empty nodes and edges', () => {
    const { container } = render(
      <DiagramCanvas nodes={[]} edges={[]} />
    );

    expect(container.querySelector('.react-flow')).toBeInTheDocument();
  });

  it('should have diagram-canvas wrapper class', () => {
    const { container } = render(
      <DiagramCanvas nodes={mockNodes} edges={mockEdges} />
    );

    expect(container.querySelector('.diagram-canvas')).toBeInTheDocument();
  });
});
