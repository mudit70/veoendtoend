import { useState } from 'react';
import type { RepoImportRequest } from '@veoendtoend/shared';

interface RepoEntry {
  url: string;
  name: string;
  branch: string;
  authToken: string;
}

interface RepoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (request: RepoImportRequest) => Promise<void>;
}

const DEFAULT_FILE_TYPES = ['.txt', '.md', '.json', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'];

function RepoImportModal({ isOpen, onClose, onImport }: RepoImportModalProps) {
  const [repos, setRepos] = useState<RepoEntry[]>([{ url: '', name: '', branch: 'main', authToken: '' }]);
  const [fileTypes, setFileTypes] = useState<string>(DEFAULT_FILE_TYPES.join(', '));
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRepo = () => {
    setRepos([...repos, { url: '', name: '', branch: 'main', authToken: '' }]);
  };

  const removeRepo = (index: number) => {
    if (repos.length > 1) {
      setRepos(repos.filter((_, i) => i !== index));
    }
  };

  const updateRepo = (index: number, field: keyof RepoEntry, value: string) => {
    const updated = [...repos];
    updated[index] = { ...updated[index], [field]: value };
    setRepos(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validRepos = repos.filter((r) => r.url.trim());
    if (validRepos.length === 0) {
      setError('Please enter at least one repository URL');
      return;
    }

    const parsedFileTypes = fileTypes
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.startsWith('.'));

    setImporting(true);
    try {
      await onImport({
        repositories: validRepos.map((r) => ({
          url: r.url.trim(),
          name: r.name.trim() || undefined,
          branch: r.branch.trim() || 'main',
          authToken: r.authToken.trim() || undefined,
        })),
        fileTypes: parsedFileTypes.length > 0 ? parsedFileTypes : undefined,
      });
      onClose();
      // Reset form
      setRepos([{ url: '', name: '', branch: 'main', authToken: '' }]);
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
            <h2 className="text-xl font-semibold">Import from Git Repositories</h2>
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
              <label className="block text-sm font-medium text-gray-700">Repositories to Import</label>
              {repos.map((repo, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Repository URL (e.g., https://github.com/user/repo.git)"
                      value={repo.url}
                      onChange={(e) => updateRepo(index, 'url', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={importing}
                    />
                    {repos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRepo(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                        disabled={importing}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Display name"
                      value={repo.name}
                      onChange={(e) => updateRepo(index, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={importing}
                    />
                    <input
                      type="text"
                      placeholder="Branch (default: main)"
                      value={repo.branch}
                      onChange={(e) => updateRepo(index, 'branch', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={importing}
                    />
                    <input
                      type="password"
                      placeholder="Auth token (optional)"
                      value={repo.authToken}
                      onChange={(e) => updateRepo(index, 'authToken', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={importing}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addRepo}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                disabled={importing}
              >
                + Add another repository
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

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> For private repositories, provide an access token with read permissions.
                The token is only used during import and is not stored.
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
                {importing ? 'Cloning & Importing...' : 'Import Repositories'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RepoImportModal;
