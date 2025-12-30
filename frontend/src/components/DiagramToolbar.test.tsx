import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiagramToolbar from './DiagramToolbar';

describe('DiagramToolbar', () => {
  const defaultProps = {
    diagramName: 'Test Diagram',
    hasUnsavedChanges: false,
    isSaving: false,
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show save button', () => {
    render(<DiagramToolbar {...defaultProps} />);

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should display diagram name', () => {
    render(<DiagramToolbar {...defaultProps} diagramName="My Diagram" />);

    expect(screen.getByText('My Diagram')).toBeInTheDocument();
  });

  it('should indicate unsaved changes', () => {
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} />);

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('should not show unsaved indicator when no changes', () => {
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={false} />);

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('should disable save when no unsaved changes', () => {
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={false} />);

    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save when has unsaved changes', () => {
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} />);

    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton).not.toBeDisabled();
  });

  it('should disable save when saving', () => {
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} isSaving={true} />);

    const saveButton = screen.getByRole('button', { name: /saving/i });
    expect(saveButton).toBeDisabled();
  });

  it('should call onSave when clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} onSave={onSave} />);

    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalled();
  });

  it('should show saving state', () => {
    render(<DiagramToolbar {...defaultProps} isSaving={true} />);

    const savingIndicator = screen.getAllByText('Saving...');
    expect(savingIndicator.length).toBeGreaterThan(0);
  });

  it('should call onSave on Ctrl+S', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} onSave={onSave} />);

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('should not call onSave on Ctrl+S when no changes', async () => {
    const onSave = vi.fn();
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={false} onSave={onSave} />);

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should show reset button when provided', () => {
    const onResetAll = vi.fn();
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} onResetAll={onResetAll} />);

    expect(screen.getByText('Reset All')).toBeInTheDocument();
  });

  it('should disable reset button when no changes', () => {
    const onResetAll = vi.fn();
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={false} onResetAll={onResetAll} />);

    const resetButton = screen.getByText('Reset All');
    expect(resetButton).toBeDisabled();
  });

  it('should call onResetAll when reset clicked', () => {
    const onResetAll = vi.fn();
    render(<DiagramToolbar {...defaultProps} hasUnsavedChanges={true} onResetAll={onResetAll} />);

    fireEvent.click(screen.getByText('Reset All'));
    expect(onResetAll).toHaveBeenCalled();
  });

  it('should show export button when provided', () => {
    const onExport = vi.fn();
    render(<DiagramToolbar {...defaultProps} onExport={onExport} />);

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should call onExport when export clicked', () => {
    const onExport = vi.fn();
    render(<DiagramToolbar {...defaultProps} onExport={onExport} />);

    fireEvent.click(screen.getByText('Export'));
    expect(onExport).toHaveBeenCalled();
  });

  it('should show zoom controls when provided', () => {
    render(
      <DiagramToolbar
        {...defaultProps}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
      />
    );

    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Fit to view')).toBeInTheDocument();
  });

  it('should have diagram-toolbar class', () => {
    const { container } = render(<DiagramToolbar {...defaultProps} />);

    expect(container.querySelector('.diagram-toolbar')).toBeInTheDocument();
  });
});

describe('DiagramToolbar beforeunload', () => {
  it('should warn before leaving with unsaved changes', () => {
    const preventDefaultMock = vi.fn();

    render(<DiagramToolbar {...{
      diagramName: 'Test',
      hasUnsavedChanges: true,
      isSaving: false,
      onSave: vi.fn(),
    }} />);

    const event = new Event('beforeunload');
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultMock });
    Object.defineProperty(event, 'returnValue', { value: '', writable: true });

    window.dispatchEvent(event);

    expect(preventDefaultMock).toHaveBeenCalled();
  });
});
