import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import BaseNode, { type BaseNodeData } from './BaseNode';

// Icons for each node type
const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const ApiIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const EventIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// User Action Node
export const UserActionNode = memo(function UserActionNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<UserIcon />} color="blue" />;
});

// Client Code Node
export const ClientCodeNode = memo(function ClientCodeNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<CodeIcon />} color="indigo" />;
});

// API Endpoint Node
export const ApiEndpointNode = memo(function ApiEndpointNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<ApiIcon />} color="green" />;
});

// Backend Logic Node
export const BackendLogicNode = memo(function BackendLogicNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<ServerIcon />} color="purple" />;
});

// Database Node
export const DatabaseNode = memo(function DatabaseNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<DatabaseIcon />} color="amber" />;
});

// Event Handler Node
export const EventHandlerNode = memo(function EventHandlerNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<EventIcon />} color="orange" />;
});

// View Update Node
export const ViewUpdateNode = memo(function ViewUpdateNode(props: NodeProps & { data: BaseNodeData }) {
  return <BaseNode {...props} icon={<ViewIcon />} color="cyan" />;
});

// Export all node types for ReactFlow registration
export const nodeTypes = {
  userAction: UserActionNode,
  clientCode: ClientCodeNode,
  apiEndpoint: ApiEndpointNode,
  backendLogic: BackendLogicNode,
  database: DatabaseNode,
  eventHandler: EventHandlerNode,
  viewUpdate: ViewUpdateNode,
};

export { BaseNode, type BaseNodeData };
