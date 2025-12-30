import { useState, useRef, useEffect, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from './nodes/BaseNode';
import {
  exportToPng,
  exportToSvg,
  exportToJson,
  getReactFlowElement,
  generateFilename,
  type ExportOptions,
} from '../utils/diagramExport';

export interface ExportMenuProps {
  /** Diagram name for filename */
  diagramName: string;
  /** Current nodes */
  nodes: Node<BaseNodeData>[];
  /** Current edges */
  edges: Edge[];
  /** Current viewport */
  viewport?: { x: number; y: number; zoom: number };
  /** Whether the menu is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type ExportFormat = 'png' | 'svg' | 'json';

/**
 * Dropdown menu for exporting diagrams in various formats
 */
export function ExportMenu({
  diagramName,
  nodes,
  edges,
  viewport,
  disabled = false,
  className = '',
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      setExportError(null);

      try {
        const filename = generateFilename(diagramName);
        const options: ExportOptions = {
          includeBackground: true,
          backgroundColor: '#ffffff',
          scale: 2,
          padding: 20,
        };

        if (format === 'json') {
          exportToJson(nodes, edges, diagramName, viewport);
        } else {
          const element = getReactFlowElement();
          if (!element) {
            throw new Error('Could not find diagram element');
          }

          if (format === 'png') {
            await exportToPng(element, filename, options);
          } else if (format === 'svg') {
            await exportToSvg(element, filename, options);
          }
        }

        setIsOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        setExportError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [diagramName, nodes, edges, viewport]
  );

  return (
    <div ref={menuRef} className={`export-menu relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className="export-button px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {isExporting ? 'Exporting...' : 'Export'}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="export-dropdown absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
          role="menu"
        >
          <button
            type="button"
            onClick={() => handleExport('png')}
            disabled={isExporting}
            className="export-option w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            role="menuitem"
          >
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Export as PNG
          </button>

          <button
            type="button"
            onClick={() => handleExport('svg')}
            disabled={isExporting}
            className="export-option w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            role="menuitem"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Export as SVG
          </button>

          <div className="border-t border-gray-100 my-1" />

          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="export-option w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            role="menuitem"
          >
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Export as JSON
          </button>
        </div>
      )}

      {exportError && (
        <div
          className="export-error absolute right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600"
          role="alert"
        >
          {exportError}
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="ml-2 text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
