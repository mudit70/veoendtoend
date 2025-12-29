import type { Operation } from '@veoendtoend/shared';

interface OperationCardProps {
  operation: Operation;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (operation: Operation) => void;
  onDelete?: (id: string) => void;
}

function OperationCard({ operation, onConfirm, onReject, onEdit, onDelete }: OperationCardProps) {
  const getTypeIcon = () => {
    switch (operation.type) {
      case 'USER_INTERACTION':
        return (
          <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'CLIENT_OPERATION':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'API_CALL':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'DATA_FLOW':
        return (
          <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
    }
  };

  const getStatusBadge = () => {
    const badges: Record<Operation['status'], { color: string; label: string }> = {
      DISCOVERED: { color: 'bg-yellow-100 text-yellow-800', label: 'Discovered' },
      CONFIRMED: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      REJECTED: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      MANUAL: { color: 'bg-blue-100 text-blue-800', label: 'Manual' },
    };
    const badge = badges[operation.status];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getConfidenceBar = () => {
    const percentage = Math.round(operation.confidence * 100);
    const getColor = () => {
      if (percentage >= 80) return 'bg-green-500';
      if (percentage >= 60) return 'bg-yellow-500';
      return 'bg-red-500';
    };
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 bg-gray-200 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${getColor()}`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
    );
  };

  const showActions = operation.status === 'DISCOVERED' && (onConfirm || onReject);

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {getTypeIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">{operation.name}</h4>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-gray-600 mb-2">{operation.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="capitalize">{operation.type.replace('_', ' ').toLowerCase()}</span>
              {getConfidenceBar()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {onEdit && (
            <button
              onClick={() => onEdit(operation)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit operation"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(operation.id)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete operation"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {onConfirm && (
            <button
              onClick={() => onConfirm(operation.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(operation.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default OperationCard;
