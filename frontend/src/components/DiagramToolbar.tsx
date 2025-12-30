import { useEffect, useCallback } from 'react';

export interface DiagramToolbarProps {
  diagramName: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onResetAll?: () => void;
  onExport?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
}

export function DiagramToolbar({
  diagramName,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onResetAll,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitView,
}: DiagramToolbarProps) {
  // Keyboard shortcut for Ctrl+S
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          onSave();
        }
      }
    },
    [hasUnsavedChanges, isSaving, onSave]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="diagram-toolbar flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      {/* Left section - Diagram name and status */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{diagramName}</h2>
        {hasUnsavedChanges && (
          <span className="unsaved-indicator inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Unsaved changes
          </span>
        )}
        {isSaving && (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving...
          </span>
        )}
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        {(onZoomIn || onZoomOut || onFitView) && (
          <div className="flex items-center gap-1 mr-2 border-r border-gray-200 pr-2">
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Zoom out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Zoom in"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            {onFitView && (
              <button
                onClick={onFitView}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Fit to view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Reset button */}
        {onResetAll && (
          <button
            onClick={onResetAll}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset All
          </button>
        )}

        {/* Export button */}
        {onExport && (
          <button
            onClick={onExport}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            Export
          </button>
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="save-button px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default DiagramToolbar;
