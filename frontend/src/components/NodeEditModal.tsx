import React, { useState, useEffect } from 'react';
import type { ComponentStatus } from '@veoendtoend/shared';

export interface NodeEditData {
  id: string;
  title: string;
  description: string;
  status: ComponentStatus;
  confidence: number;
  sourceExcerpt?: string;
  isUserModified: boolean;
  originalTitle?: string;
  originalDescription?: string;
}

export interface NodeEditModalProps {
  isOpen: boolean;
  node: NodeEditData | null;
  onClose: () => void;
  onSave: (nodeId: string, updates: { title: string; description: string }) => Promise<void>;
  onReset: (nodeId: string) => Promise<void>;
}

export function NodeEditModal({
  isOpen,
  node,
  onClose,
  onSave,
  onReset,
}: NodeEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form with node data
  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description);
      setError(null);
    }
  }, [node]);

  if (!isOpen || !node) {
    return null;
  }

  const hasChanges = title !== node.title || description !== node.description;
  const canReset = node.isUserModified || node.originalTitle || node.originalDescription;

  const handleSave = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(node.id, { title, description });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);

    try {
      await onReset(node.id);
      // Update local state with original values
      if (node.originalTitle) setTitle(node.originalTitle);
      if (node.originalDescription) setDescription(node.originalDescription);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset component');
    } finally {
      setResetting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  const confidencePercent = Math.round(node.confidence * 100);
  const confidenceColor =
    confidencePercent >= 80
      ? 'bg-green-100 text-green-800'
      : confidencePercent >= 50
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Component</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              node.status === 'POPULATED'
                ? 'bg-green-100 text-green-800'
                : node.status === 'USER_MODIFIED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {node.status.replace('_', ' ')}
          </span>
          {node.status !== 'GREYED_OUT' && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}>
              {confidencePercent}% confidence
            </span>
          )}
          {node.isUserModified && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Modified
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Component title"
              disabled={saving || resetting}
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Component description"
              disabled={saving || resetting}
            />
          </div>

          {/* Source excerpt */}
          {node.sourceExcerpt && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Reference
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 italic">
                &quot;{node.sourceExcerpt}&quot;
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {canReset && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving || resetting}
                  className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset to Original'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || resetting}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || resetting || !title.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        {/* Keyboard shortcut hint */}
        <div className="mt-3 text-xs text-gray-400 text-center">
          Press Ctrl+Enter to save, Esc to cancel
        </div>
      </div>
    </div>
  );
}

export default NodeEditModal;
