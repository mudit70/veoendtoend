import { useState, useEffect } from 'react';
import type { Operation, OperationType } from '@veoendtoend/shared';

interface OperationModalProps {
  isOpen: boolean;
  operation?: Operation | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; type: OperationType }) => Promise<void>;
}

const OPERATION_TYPES: { value: OperationType; label: string }[] = [
  { value: 'USER_INTERACTION', label: 'User Interaction' },
  { value: 'CLIENT_OPERATION', label: 'Client Operation' },
  { value: 'API_CALL', label: 'API Call' },
  { value: 'DATA_FLOW', label: 'Data Flow' },
];

function OperationModal({ isOpen, operation, onClose, onSubmit }: OperationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<OperationType>('API_CALL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!operation;

  useEffect(() => {
    if (operation) {
      setName(operation.name);
      setDescription(operation.description);
      setType(operation.type);
    } else {
      setName('');
      setDescription('');
      setType('API_CALL');
    }
    setError(null);
  }, [operation, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({ name: name.trim(), description: description.trim(), type });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save operation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Operation' : 'Add Operation'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., User Login"
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this operation does"
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as OperationType)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            >
              {OPERATION_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OperationModal;
