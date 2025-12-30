import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportMenu } from './ExportMenu';
import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from './nodes/BaseNode';

// Mock the export functions
const mockExportToPng = vi.fn().mockResolvedValue(undefined);
const mockExportToSvg = vi.fn().mockResolvedValue(undefined);
const mockExportToJson = vi.fn();
const mockGetReactFlowElement = vi.fn().mockReturnValue(document.createElement('div'));
const mockGenerateFilename = vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-'));

vi.mock('../utils/diagramExport', () => ({
  exportToPng: (...args: unknown[]) => mockExportToPng(...args),
  exportToSvg: (...args: unknown[]) => mockExportToSvg(...args),
  exportToJson: (...args: unknown[]) => mockExportToJson(...args),
  getReactFlowElement: () => mockGetReactFlowElement(),
  generateFilename: (name: string) => mockGenerateFilename(name),
}));

describe('ExportMenu', () => {
  const mockNodes: Node<BaseNodeData>[] = [
    {
      id: 'node-1',
      type: 'userAction',
      position: { x: 0, y: 0 },
      data: {
        title: 'User Action',
        status: 'POPULATED',
        confidence: 0.85,
        isUserModified: false,
        componentType: 'USER_ACTION',
      },
    },
  ];

  const mockEdges: Edge[] = [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
    },
  ];

  const defaultProps = {
    diagramName: 'Test Diagram',
    nodes: mockNodes,
    edges: mockEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockExportToPng.mockResolvedValue(undefined);
    mockExportToSvg.mockResolvedValue(undefined);
    mockGetReactFlowElement.mockReturnValue(document.createElement('div'));
  });

  it('should render export button', () => {
    render(<ExportMenu {...defaultProps} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should open menu on button click', () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));

    expect(screen.getByText('Export as PNG')).toBeInTheDocument();
    expect(screen.getByText('Export as SVG')).toBeInTheDocument();
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
  });

  it('should close menu on second click', () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Export as PNG')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Export'));
    expect(screen.queryByText('Export as PNG')).not.toBeInTheDocument();
  });

  it('should close menu on Escape key', () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Export as PNG')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Export as PNG')).not.toBeInTheDocument();
  });

  it('should call exportToJson when JSON option clicked', async () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as JSON'));

    await waitFor(() => {
      expect(mockExportToJson).toHaveBeenCalledWith(
        mockNodes,
        mockEdges,
        'Test Diagram',
        { x: 0, y: 0, zoom: 1 }
      );
    });
  });

  it('should call exportToPng when PNG option clicked', async () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as PNG'));

    await waitFor(() => {
      expect(mockExportToPng).toHaveBeenCalled();
    });
  });

  it('should call exportToSvg when SVG option clicked', async () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as SVG'));

    await waitFor(() => {
      expect(mockExportToSvg).toHaveBeenCalled();
    });
  });

  it('should close menu after successful export', async () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as JSON'));

    await waitFor(() => {
      expect(screen.queryByText('Export as PNG')).not.toBeInTheDocument();
    });
  });

  it('should show error on export failure', async () => {
    mockExportToPng.mockRejectedValueOnce(new Error('Export failed'));

    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as PNG'));

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
    });
  });

  it('should show error when element not found', async () => {
    mockGetReactFlowElement.mockReturnValueOnce(null);

    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as PNG'));

    await waitFor(() => {
      expect(screen.getByText('Could not find diagram element')).toBeInTheDocument();
    });
  });

  it('should dismiss error on click', async () => {
    mockExportToPng.mockRejectedValueOnce(new Error('Export failed'));

    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Export as PNG'));

    await waitFor(() => {
      expect(screen.getByText('Export failed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Dismiss error'));

    expect(screen.queryByText('Export failed')).not.toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ExportMenu {...defaultProps} disabled={true} />);

    const button = screen.getByText('Export').closest('button');
    expect(button).toBeDisabled();
  });

  it('should have proper ARIA attributes', () => {
    render(<ExportMenu {...defaultProps} />);

    const button = screen.getByText('Export').closest('button');
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByText('Export'));

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have menu role on dropdown', () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should have menuitem role on options', () => {
    render(<ExportMenu {...defaultProps} />);

    fireEvent.click(screen.getByText('Export'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(3);
  });

  it('should apply custom className', () => {
    const { container } = render(<ExportMenu {...defaultProps} className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
