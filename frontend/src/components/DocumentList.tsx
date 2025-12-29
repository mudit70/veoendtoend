import { useMemo, useState } from 'react';
import type { Document } from '@veoendtoend/shared';

interface DocumentListProps {
  documents: Document[];
  onDeleteDocument: (id: string) => void;
  onDeleteSource: (sourceName: string) => void;
}

interface GroupedDocuments {
  sourceName: string;
  sourceType: Document['sourceType'];
  sourcePath?: string;
  documents: Document[];
}

function DocumentList({ documents, onDeleteDocument, onDeleteSource }: DocumentListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedDocuments = useMemo(() => {
    const groups = new Map<string, GroupedDocuments>();

    for (const doc of documents) {
      const key = doc.sourceName || 'Uploaded Files';
      if (!groups.has(key)) {
        groups.set(key, {
          sourceName: key,
          sourceType: doc.sourceType,
          sourcePath: doc.sourcePath,
          documents: [],
        });
      }
      groups.get(key)!.documents.push(doc);
    }

    return Array.from(groups.values()).sort((a, b) => {
      // Put "Uploaded Files" first
      if (a.sourceName === 'Uploaded Files') return -1;
      if (b.sourceName === 'Uploaded Files') return 1;
      return a.sourceName.localeCompare(b.sourceName);
    });
  }, [documents]);

  const toggleGroup = (sourceName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sourceName)) {
        next.delete(sourceName);
      } else {
        next.add(sourceName);
      }
      return next;
    });
  };

  const getSourceIcon = (sourceType: Document['sourceType']) => {
    switch (sourceType) {
      case 'UPLOAD':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'FOLDER':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'REPOSITORY':
        return (
          <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getSourceLabel = (sourceType: Document['sourceType']) => {
    switch (sourceType) {
      case 'UPLOAD':
        return 'Uploaded';
      case 'FOLDER':
        return 'Local Folder';
      case 'REPOSITORY':
        return 'Git Repository';
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No documents yet</p>
        <p className="text-sm mt-2">
          Upload files, import from folders, or clone repositories to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedDocuments.map((group) => {
        const isExpanded = expandedGroups.has(group.sourceName);
        const fileCount = group.documents.length;

        return (
          <div key={group.sourceName} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleGroup(group.sourceName)}
            >
              <div className="flex items-center gap-3">
                {getSourceIcon(group.sourceType)}
                <div>
                  <p className="font-medium">{group.sourceName}</p>
                  <p className="text-sm text-gray-500">
                    {getSourceLabel(group.sourceType)} • {fileCount} file{fileCount !== 1 ? 's' : ''}
                    {group.sourcePath && (
                      <span className="ml-2 text-gray-400 truncate max-w-xs inline-block align-bottom">
                        ({group.sourcePath})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {group.sourceType !== 'UPLOAD' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete all ${fileCount} files from "${group.sourceName}"?`)) {
                        onDeleteSource(group.sourceName);
                      }
                    }}
                    className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete All
                  </button>
                )}
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isExpanded && (
              <div className="divide-y">
                {group.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.filename}</p>
                      <p className="text-sm text-gray-500">
                        {doc.filepath && (
                          <span className="text-gray-400 mr-2">{doc.filepath}</span>
                        )}
                        {(doc.size / 1024).toFixed(1)} KB • {doc.mimeType}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${doc.filename}"?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="ml-4 text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DocumentList;
