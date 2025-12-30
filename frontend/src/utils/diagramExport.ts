import { toPng, toSvg } from 'html-to-image';
import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from '../components/nodes/BaseNode';

export interface ExportOptions {
  /** Include background in export */
  includeBackground?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Scale factor for PNG export */
  scale?: number;
  /** Padding around content */
  padding?: number;
}

export interface DiagramExportData {
  /** Export metadata */
  metadata: {
    exportedAt: string;
    version: string;
    name: string;
  };
  /** Nodes data */
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
      title: string;
      description?: string;
      status?: string;
      componentType?: string;
    };
  }>;
  /** Edges data */
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    label?: string;
  }>;
  /** Viewport state */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Export diagram element as PNG
 */
export async function exportToPng(
  element: HTMLElement,
  filename: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    includeBackground = true,
    backgroundColor = '#ffffff',
    scale = 2,
    padding = 20,
  } = options;

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: includeBackground ? backgroundColor : undefined,
      pixelRatio: scale,
      style: {
        padding: `${padding}px`,
      },
    });

    downloadFile(dataUrl, `${filename}.png`);
  } catch (error) {
    console.error('Failed to export as PNG:', error);
    throw new Error('Failed to export diagram as PNG');
  }
}

/**
 * Export diagram element as SVG
 */
export async function exportToSvg(
  element: HTMLElement,
  filename: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    includeBackground = true,
    backgroundColor = '#ffffff',
    padding = 20,
  } = options;

  try {
    const dataUrl = await toSvg(element, {
      backgroundColor: includeBackground ? backgroundColor : undefined,
      style: {
        padding: `${padding}px`,
      },
    });

    downloadFile(dataUrl, `${filename}.svg`);
  } catch (error) {
    console.error('Failed to export as SVG:', error);
    throw new Error('Failed to export diagram as SVG');
  }
}

/**
 * Export diagram data as JSON
 */
export function exportToJson(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  diagramName: string,
  viewport?: { x: number; y: number; zoom: number }
): void {
  const exportData: DiagramExportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      name: diagramName,
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type || 'default',
      position: node.position,
      data: {
        title: node.data?.title || '',
        description: node.data?.description,
        status: node.data?.status,
        componentType: node.data?.componentType,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: typeof edge.label === 'string' ? edge.label : undefined,
    })),
    viewport,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const dataUrl = URL.createObjectURL(blob);

  downloadFile(dataUrl, `${diagramName}.json`);

  URL.revokeObjectURL(dataUrl);
}

/**
 * Parse JSON export and validate structure
 */
export function parseJsonExport(jsonString: string): DiagramExportData {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.metadata || !data.nodes || !data.edges) {
      throw new Error('Invalid export format: missing required fields');
    }

    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      throw new Error('Invalid export format: nodes and edges must be arrays');
    }

    return data as DiagramExportData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

/**
 * Helper to download a file from data URL
 */
function downloadFile(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get the ReactFlow wrapper element for export
 */
export function getReactFlowElement(): HTMLElement | null {
  return document.querySelector('.react-flow') as HTMLElement | null;
}

/**
 * Generate a safe filename from diagram name
 */
export function generateFilename(diagramName: string): string {
  return diagramName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
