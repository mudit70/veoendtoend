import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';

// Security-specific icons
const FirewallIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const WAFIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const LoadBalancerIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const GatewayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// Firewall Node
export const FirewallNode = memo(function FirewallNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<FirewallIcon />} color="red" />;
});

// WAF Node
export const WAFNode = memo(function WAFNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<WAFIcon />} color="orange" />;
});

// Load Balancer Node
export const LoadBalancerNode = memo(function LoadBalancerNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<LoadBalancerIcon />} color="teal" />;
});

// API Gateway Node
export const ApiGatewayNode = memo(function ApiGatewayNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<GatewayIcon />} color="violet" />;
});

// Security Group Container Node
export interface SecurityGroupData {
  label: string;
  children: string[]; // IDs of child nodes
}

export const SecurityGroupNode = memo(function SecurityGroupNode({
  data,
  selected,
}: NodeProps & { data: SecurityGroupData }) {
  return (
    <div
      className={`
        security-group-container
        min-w-[400px] min-h-[150px]
        bg-red-50 bg-opacity-50
        border-2 border-dashed border-red-300
        rounded-xl p-4
        ${selected ? 'ring-2 ring-red-400 ring-offset-2' : ''}
      `}
    >
      {/* Group Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-red-700">{data.label || 'Security Layer'}</span>
      </div>

      {/* Input handle for the group */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-red-400 !border-2 !border-white"
      />

      {/* Output handle for the group */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-red-400 !border-2 !border-white"
      />

      {/* Placeholder for child nodes - actual nodes are rendered by ReactFlow */}
      <div className="flex gap-2 items-center justify-center min-h-[80px] text-gray-400 text-sm">
        {data.children?.length === 0 && 'Security components will appear here'}
      </div>
    </div>
  );
});

// Export security node types
export const securityNodeTypes = {
  firewall: FirewallNode,
  waf: WAFNode,
  loadBalancer: LoadBalancerNode,
  apiGateway: ApiGatewayNode,
  securityGroup: SecurityGroupNode,
};
