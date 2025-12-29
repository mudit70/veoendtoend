import { useState } from 'react';
import type { Operation } from '@veoendtoend/shared';
import OperationCard from './OperationCard';

interface OperationsListProps {
  operations: Operation[];
  loading?: boolean;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (operation: Operation) => void;
  onDelete?: (id: string) => void;
  onAddManual?: () => void;
}

type FilterStatus = 'all' | Operation['status'];

function OperationsList({
  operations,
  loading,
  onConfirm,
  onReject,
  onEdit,
  onDelete,
  onAddManual,
}: OperationsListProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const filteredOperations = statusFilter === 'all'
    ? operations
    : operations.filter(op => op.status === statusFilter);

  const statusCounts = {
    all: operations.length,
    DISCOVERED: operations.filter(op => op.status === 'DISCOVERED').length,
    CONFIRMED: operations.filter(op => op.status === 'CONFIRMED').length,
    REJECTED: operations.filter(op => op.status === 'REJECTED').length,
    MANUAL: operations.filter(op => op.status === 'MANUAL').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="text-gray-500">Loading operations...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['all', 'DISCOVERED', 'CONFIRMED', 'REJECTED', 'MANUAL'] as FilterStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              <span className="ml-1 text-xs opacity-75">({statusCounts[status]})</span>
            </button>
          ))}
        </div>
        {onAddManual && (
          <button
            onClick={onAddManual}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Operation
          </button>
        )}
      </div>

      {filteredOperations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
          <svg className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 mb-2">
            {statusFilter === 'all'
              ? 'No operations yet'
              : `No ${statusFilter.toLowerCase()} operations`}
          </p>
          {statusFilter === 'all' && onAddManual && (
            <button
              onClick={onAddManual}
              className="text-blue-600 hover:underline text-sm"
            >
              Add your first operation
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOperations.map(operation => (
            <OperationCard
              key={operation.id}
              operation={operation}
              onConfirm={onConfirm}
              onReject={onReject}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default OperationsList;
