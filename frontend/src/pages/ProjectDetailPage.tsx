import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Project, Document, FolderImportRequest, RepoImportRequest } from '@veoendtoend/shared';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import FolderImportModal from '../components/FolderImportModal';
import RepoImportModal from '../components/RepoImportModal';

function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadProjectAndDocuments();
    }
  }, [id]);

  const loadProjectAndDocuments = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [projectResponse, documentsResponse] = await Promise.all([
        apiClient.getProject(id),
        apiClient.getDocuments(id),
      ]);
      setProject(projectResponse.data || null);
      setDocuments(documentsResponse.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!id) return;

    try {
      if (files.length === 1) {
        await apiClient.uploadDocument(id, files[0]);
      } else {
        await apiClient.uploadDocumentsBatch(id, files);
      }
      await loadProjectAndDocuments();
    } catch (err) {
      setError('Failed to upload documents');
      console.error(err);
    }
  };

  const handleFolderImport = async (request: FolderImportRequest) => {
    if (!id) return;

    const result = await apiClient.importFromFolders(id, request);
    if (result.data?.errors && result.data.errors.length > 0) {
      setError(`Imported ${result.data.importedFiles} files. ${result.data.errors.length} errors occurred.`);
    }
    await loadProjectAndDocuments();
  };

  const handleRepoImport = async (request: RepoImportRequest) => {
    if (!id) return;

    const result = await apiClient.importFromRepos(id, request);
    if (result.data?.errors && result.data.errors.length > 0) {
      setError(`Imported ${result.data.importedFiles} files. ${result.data.errors.length} errors occurred.`);
    }
    await loadProjectAndDocuments();
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiClient.deleteDocument(documentId);
      await loadProjectAndDocuments();
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const handleDeleteSource = async (sourceName: string) => {
    if (!id) return;

    try {
      await apiClient.deleteDocumentsBySource(id, sourceName);
      await loadProjectAndDocuments();
    } catch (err) {
      setError('Failed to delete documents');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Project not found</p>
        <Link to="/projects" className="text-blue-600 hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/projects" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Projects
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-gray-600">{project.description}</p>
        )}
        <p className="text-gray-400 text-sm mt-4">
          Created: {new Date(project.createdAt).toLocaleString()}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Import Documents</h2>

        <DocumentUpload onUpload={handleFileUpload} />

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Import from Folders
          </button>
          <button
            onClick={() => setShowRepoModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Import from Git Repos
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Documents</h2>
          <span className="text-gray-500 text-sm">
            {documents.length} file{documents.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DocumentList
          documents={documents}
          onDeleteDocument={handleDeleteDocument}
          onDeleteSource={handleDeleteSource}
        />
      </div>

      {/* Placeholder for future features */}
      <div className="mt-6 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">
          Operation discovery and diagram generation features coming soon...
        </p>
      </div>

      <FolderImportModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onImport={handleFolderImport}
      />

      <RepoImportModal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        onImport={handleRepoImport}
      />
    </div>
  );
}

export default ProjectDetailPage;
