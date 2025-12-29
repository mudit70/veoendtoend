import { useState } from 'react';
import type { FolderImportRequest } from '@veoendtoend/shared';

interface FolderEntry {
  path: string;
  name: string;
  recursive: boolean;
}

interface FolderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (request: FolderImportRequest) => Promise<void>;
}

const DEFAULT_FILE_TYPES = ['.txt', '.md', '.json', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'];

function FolderImportModal({ isOpen, onClose, onImport }: FolderImportModalProps) {
  const [folders, setFolders] = useState<FolderEntry[]>([{ path: '', name: '', recursive: true }]);
  const [fileTypes, setFileTypes] = useState<string>(DEFAULT_FILE_TYPES.join(', '));
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFolder = () => {
    setFolders([...folders, { path: '', name: '', recursive: true }]);
  };

  const removeFolder = (index: number) => {
    if (folders.length > 1) {
      setFolders(folders.filter((_, i) => i !== index));
    }
  };

  const updateFolder = (index: number, field: keyof FolderEntry, value: string | boolean) => {
    const updated = [...folders];
    updated[index] = { ...updated[index], [field]: value };
    setFolders(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validFolders = folders.filter((f) => f.path.trim());
    if (validFolders.length === 0) {
      setError('Please enter at least one folder path');
      return;
    }

    const parsedFileTypes = fileTypes
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.startsWith('.'));

    setImporting(true);
    try {
      await onImport({
        folders: validFolders.map((f) => ({
          path: f.path.trim(),
          name: f.name.trim() || undefined,
          recursive: f.recursive,
        })),
        fileTypes: parsedFileTypes.length > 0 ? parsedFileTypes : undefined,
      });
      onClose();
      // Reset form
      setFolders([{ path: '', name: '', recursive: true }]);
      setFileTypes(DEFAULT_FILE_TYPES.join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Import from Local Folders</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={importing}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-gray-700">Folders to Import</label>
              {folders.map((folder, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Folder path (e.g., /path/to/project/src)"
                      value={folder.path}
                      onChange={(e) => updateFolder(index, 'path', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={importing}
                    />
                    {folders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFolder(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                        disabled={importing}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Display name (optional)"
                      value={folder.name}
                      onChange={(e) => updateFolder(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={importing}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={folder.recursive}
                        onChange={(e) => updateFolder(index, 'recursive', e.target.checked)}
                        disabled={importing}
                      />
                      Include subfolders
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addFolder}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                disabled={importing}
              >
                + Add another folder
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Types to Include
              </label>
              <input
                type="text"
                value={fileTypes}
                onChange={(e) => setFileTypes(e.target.value)}
                placeholder=".txt, .md, .json, .ts, ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={importing}
              />
              <p className="text-gray-500 text-xs mt-1">
                Comma-separated list of file extensions
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import Files'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FolderImportModal;
