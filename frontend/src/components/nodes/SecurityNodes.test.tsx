import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { BaseNodeData } from './BaseNode';
import {
  FirewallNode,
  WAFNode,
  LoadBalancerNode,
  ApiGatewayNode,
  SecurityGroupNode,
  type SecurityGroupData,
} from './SecurityNodes';

// Wrapper to provide ReactFlow context
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

const mockSecurityNodeData: BaseNodeData = {
  title: 'Test Security Node',
  description: 'Security component description',
  status: 'POPULATED',
  confidence: 0.9,
  isUserModified: false,
  componentType: 'FIREWALL',
};

const createNodeProps = (data: Partial<BaseNodeData> = {}) => ({
  id: 'test-node',
  type: 'default',
  data: { ...mockSecurityNodeData, ...data },
  selected: false,
  isConnectable: true,
  zIndex: 0,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

const mockSecurityGroupData: SecurityGroupData = {
  label: 'Security Layer',
  children: ['firewall-1', 'waf-1', 'lb-1', 'gateway-1'],
};

const createGroupProps = (data: Partial<SecurityGroupData> = {}) => ({
  id: 'security-group',
  type: 'securityGroup',
  data: { ...mockSecurityGroupData, ...data },
  selected: false,
  isConnectable: true,
  zIndex: 0,
  dragging: false,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

describe('Security Node Components', () => {
  describe('FirewallNode', () => {
    it('should render firewall node', () => {
      render(
        <Wrapper>
          <FirewallNode {...createNodeProps({ title: 'Firewall' })} />
        </Wrapper>
      );

      expect(screen.getByText('Firewall')).toBeInTheDocument();
    });

    it('should show security description', () => {
      render(
        <Wrapper>
          <FirewallNode {...createNodeProps({ description: 'Network firewall protection' })} />
        </Wrapper>
      );

      expect(screen.getByText('Network firewall protection')).toBeInTheDocument();
    });
  });

  describe('WAFNode', () => {
    it('should render WAF node', () => {
      render(
        <Wrapper>
          <WAFNode {...createNodeProps({ title: 'Web Application Firewall' })} />
        </Wrapper>
      );

      expect(screen.getByText('Web Application Firewall')).toBeInTheDocument();
    });
  });

  describe('LoadBalancerNode', () => {
    it('should render load balancer node', () => {
      render(
        <Wrapper>
          <LoadBalancerNode {...createNodeProps({ title: 'Load Balancer' })} />
        </Wrapper>
      );

      expect(screen.getByText('Load Balancer')).toBeInTheDocument();
    });
  });

  describe('ApiGatewayNode', () => {
    it('should render API gateway node', () => {
      render(
        <Wrapper>
          <ApiGatewayNode {...createNodeProps({ title: 'API Gateway' })} />
        </Wrapper>
      );

      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });
  });
});

describe('SecurityGroupNode', () => {
  it('should render all security sub-components', () => {
    render(
      <Wrapper>
        <SecurityGroupNode {...createGroupProps()} />
      </Wrapper>
    );

    expect(screen.getByText('Security Layer')).toBeInTheDocument();
  });

  it('should display Security Layer label', () => {
    render(
      <Wrapper>
        <SecurityGroupNode {...createGroupProps({ label: 'Custom Security Layer' })} />
      </Wrapper>
    );

    expect(screen.getByText('Custom Security Layer')).toBeInTheDocument();
  });

  it('should have container styling', () => {
    const { container } = render(
      <Wrapper>
        <SecurityGroupNode {...createGroupProps()} />
      </Wrapper>
    );

    const groupNode = container.querySelector('.security-group-container');
    expect(groupNode).toBeInTheDocument();
  });

  it('should show placeholder when no children', () => {
    render(
      <Wrapper>
        <SecurityGroupNode {...createGroupProps({ children: [] })} />
      </Wrapper>
    );

    expect(screen.getByText('Security components will appear here')).toBeInTheDocument();
  });

  it('should not show placeholder when has children', () => {
    render(
      <Wrapper>
        <SecurityGroupNode {...createGroupProps({ children: ['node-1'] })} />
      </Wrapper>
    );

    expect(screen.queryByText('Security components will appear here')).not.toBeInTheDocument();
  });

  it('should apply selected styling', () => {
    const { container } = render(
      <Wrapper>
        <SecurityGroupNode {...{ ...createGroupProps(), selected: true }} />
      </Wrapper>
    );

    const groupNode = container.querySelector('.security-group-container');
    expect(groupNode?.className).toContain('ring-2');
  });
});
