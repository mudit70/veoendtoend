import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';
import {
  UserActionNode,
  ClientCodeNode,
  ApiEndpointNode,
  BackendLogicNode,
  DatabaseNode,
  EventHandlerNode,
  ViewUpdateNode,
} from './index';

// Wrapper to provide ReactFlow context
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

const mockNodeData: BaseNodeData = {
  title: 'Test Node',
  description: 'This is a test node description',
  status: 'POPULATED',
  confidence: 0.85,
  sourceExcerpt: 'Some source text',
  isUserModified: false,
  componentType: 'USER_ACTION',
};

const createNodeProps = (data: Partial<BaseNodeData> = {}) => ({
  id: 'test-node',
  type: 'default',
  data: { ...mockNodeData, ...data },
  selected: false,
  isConnectable: true,
  zIndex: 0,
  dragging: false,
  draggable: true,
  selectable: true,
  deletable: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

describe('BaseNode', () => {
  it('should render node with title and description', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps()} />
      </Wrapper>
    );

    expect(screen.getByText('Test Node')).toBeInTheDocument();
    expect(screen.getByText('This is a test node description')).toBeInTheDocument();
  });

  it('should show confidence badge', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ confidence: 0.85 })} />
      </Wrapper>
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should show source badge when excerpt exists', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ sourceExcerpt: 'Some source' })} />
      </Wrapper>
    );

    expect(screen.getByText('Source')).toBeInTheDocument();
  });

  it('should not show source badge when no excerpt', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ sourceExcerpt: undefined })} />
      </Wrapper>
    );

    expect(screen.queryByText('Source')).not.toBeInTheDocument();
  });

  it('should show modified indicator when modified', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ isUserModified: true })} />
      </Wrapper>
    );

    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('should not show modified indicator when not modified', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ isUserModified: false })} />
      </Wrapper>
    );

    expect(screen.queryByText('Modified')).not.toBeInTheDocument();
  });

  it('should apply greyed out style', () => {
    const { container } = render(
      <Wrapper>
        <BaseNode {...createNodeProps({ status: 'GREYED_OUT' })} />
      </Wrapper>
    );

    const node = container.firstChild as HTMLElement;
    expect(node.className).toContain('bg-gray-100');
  });

  it('should apply populated style', () => {
    const { container } = render(
      <Wrapper>
        <BaseNode {...createNodeProps({ status: 'POPULATED' })} />
      </Wrapper>
    );

    const node = container.firstChild as HTMLElement;
    expect(node.className).toContain('bg-white');
    expect(node.className).toContain('border-green-500');
  });

  it('should apply user modified style', () => {
    const { container } = render(
      <Wrapper>
        <BaseNode {...createNodeProps({ status: 'USER_MODIFIED' })} />
      </Wrapper>
    );

    const node = container.firstChild as HTMLElement;
    expect(node.className).toContain('bg-blue-50');
    expect(node.className).toContain('border-blue-500');
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'This is a very long description that should be truncated when it exceeds the maximum character limit for display purposes';
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ description: longDescription })} />
      </Wrapper>
    );

    const truncated = screen.getByText(/This is a very long/);
    expect(truncated.textContent).toContain('...');
  });

  it('should not show confidence badge when greyed out', () => {
    render(
      <Wrapper>
        <BaseNode {...createNodeProps({ status: 'GREYED_OUT', confidence: 0.5 })} />
      </Wrapper>
    );

    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });
});

describe('Specialized Node Components', () => {
  it('should render UserActionNode', () => {
    render(
      <Wrapper>
        <UserActionNode {...createNodeProps({ title: 'User Action' })} />
      </Wrapper>
    );

    expect(screen.getByText('User Action')).toBeInTheDocument();
  });

  it('should render ClientCodeNode', () => {
    render(
      <Wrapper>
        <ClientCodeNode {...createNodeProps({ title: 'Client Code' })} />
      </Wrapper>
    );

    expect(screen.getByText('Client Code')).toBeInTheDocument();
  });

  it('should render ApiEndpointNode', () => {
    render(
      <Wrapper>
        <ApiEndpointNode {...createNodeProps({ title: 'API Endpoint' })} />
      </Wrapper>
    );

    expect(screen.getByText('API Endpoint')).toBeInTheDocument();
  });

  it('should render BackendLogicNode', () => {
    render(
      <Wrapper>
        <BackendLogicNode {...createNodeProps({ title: 'Backend Logic' })} />
      </Wrapper>
    );

    expect(screen.getByText('Backend Logic')).toBeInTheDocument();
  });

  it('should render DatabaseNode', () => {
    render(
      <Wrapper>
        <DatabaseNode {...createNodeProps({ title: 'Database' })} />
      </Wrapper>
    );

    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('should render EventHandlerNode', () => {
    render(
      <Wrapper>
        <EventHandlerNode {...createNodeProps({ title: 'Event Handler' })} />
      </Wrapper>
    );

    expect(screen.getByText('Event Handler')).toBeInTheDocument();
  });

  it('should render ViewUpdateNode', () => {
    render(
      <Wrapper>
        <ViewUpdateNode {...createNodeProps({ title: 'View Update' })} />
      </Wrapper>
    );

    expect(screen.getByText('View Update')).toBeInTheDocument();
  });
});
