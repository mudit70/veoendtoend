import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentStatus } from '@veoendtoend/shared';

export interface BaseNodeData {
  title: string;
  description: string;
  status: ComponentStatus;
  confidence: number;
  sourceExcerpt?: string;
  isUserModified: boolean;
  componentType: string;
}

export interface BaseNodeProps extends NodeProps {
  data: BaseNodeData;
  icon?: React.ReactNode;
  color?: string;
  showHandles?: boolean;
}

const statusStyles: Record<ComponentStatus, { bg: string; border: string; text: string }> = {
  POPULATED: {
    bg: 'bg-white',
    border: 'border-green-500',
    text: 'text-gray-900',
  },
  GREYED_OUT: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-400',
  },
  USER_MODIFIED: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-gray-900',
  },
};

export const BaseNode = memo(function BaseNode({
  data,
  icon,
  color = 'gray',
  showHandles = true,
  selected,
}: BaseNodeProps) {
  const { title, description, status, confidence, sourceExcerpt, isUserModified } = data;
  const styles = statusStyles[status] || statusStyles.GREYED_OUT;

  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidencePercent >= 80 ? 'bg-green-500' :
    confidencePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div
      className={`
        min-w-[180px] max-w-[220px] rounded-lg shadow-md border-2
        ${styles.bg} ${styles.border} ${styles.text}
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {showHandles && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* Header */}
      <div className={`px-3 py-2 border-b ${status === 'GREYED_OUT' ? 'border-gray-200' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          {icon && (
            <span className={`text-${color}-500 flex-shrink-0`}>
              {icon}
            </span>
          )}
          <span className="font-semibold text-sm truncate">{title}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 mt-1">
          {/* Confidence badge */}
          {status !== 'GREYED_OUT' && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white ${confidenceColor}`}
              title={`Confidence: ${confidencePercent}%`}
            >
              {confidencePercent}%
            </span>
          )}

          {/* Source badge */}
          {sourceExcerpt && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
              title="Has source reference"
            >
              Source
            </span>
          )}

          {/* Modified indicator */}
          {isUserModified && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
              title="User modified"
            >
              Modified
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-3 py-2">
        <p className={`text-xs leading-relaxed ${status === 'GREYED_OUT' ? 'text-gray-400' : 'text-gray-600'}`}>
          {description.length > 80 ? `${description.slice(0, 80)}...` : description}
        </p>
      </div>

      {showHandles && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}
    </div>
  );
});

export default BaseNode;
