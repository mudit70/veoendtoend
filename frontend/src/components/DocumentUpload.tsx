import { useState, useCallback, useRef } from 'react';

interface DocumentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

function DocumentUpload({ onUpload, disabled }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploading(true);
      try {
        await onUpload(files);
      } finally {
        setUploading(false);
      }
    }
  }, [disabled, onUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files?.length) return;

    const files = Array.from(e.target.files);
    setUploading(true);
    try {
      await onUpload(files);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [disabled, onUpload]);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".txt,.md,.json,.pdf,.ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.rb,.php,.vue,.svelte,.css,.html,.xml,.yaml,.yml"
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {uploading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-gray-600">Uploading files...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <svg
            className={`h-12 w-12 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-gray-600 mb-1">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-gray-400 text-sm">
            Multiple files supported: .txt, .md, .json, .ts, .js, .py, and more
          </p>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
