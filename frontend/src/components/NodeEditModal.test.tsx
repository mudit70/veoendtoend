import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NodeEditModal, { type NodeEditData } from './NodeEditModal';

const mockNode: NodeEditData = {
  id: 'node-1',
  title: 'User Action',
  description: 'User clicks the login button',
  status: 'POPULATED',
  confidence: 0.85,
  sourceExcerpt: 'The user initiates login by clicking the button',
  isUserModified: false,
};

const modifiedNode: NodeEditData = {
  ...mockNode,
  status: 'USER_MODIFIED',
  isUserModified: true,
  originalTitle: 'Original Title',
  originalDescription: 'Original description',
};

describe('NodeEditModal', () => {
  it('should not render when closed', () => {
    render(
      <NodeEditModal
        isOpen={false}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.queryByText('Edit Component')).not.toBeInTheDocument();
  });

  it('should not render when node is null', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={null}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.queryByText('Edit Component')).not.toBeInTheDocument();
  });

  it('should display current values', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('User Action')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User clicks the login button')).toBeInTheDocument();
  });

  it('should display status badge', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('POPULATED')).toBeInTheDocument();
  });

  it('should display confidence', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('85% confidence')).toBeInTheDocument();
  });

  it('should display source reference when available', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText(/The user initiates login/)).toBeInTheDocument();
  });

  it('should call onSave with updated values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={onClose}
        onSave={onSave}
        onReset={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue('User Action');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('node-1', {
        title: 'Updated Title',
        description: 'User clicks the login button',
      });
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onCancel when cancelled', () => {
    const onClose = vi.fn();

    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={onClose}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should show reset button when modified', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={modifiedNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Reset to Original')).toBeInTheDocument();
  });

  it('should not show reset button when not modified', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.queryByText('Reset to Original')).not.toBeInTheDocument();
  });

  it('should call onReset when reset clicked', async () => {
    const onReset = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <NodeEditModal
        isOpen={true}
        node={modifiedNode}
        onClose={onClose}
        onSave={vi.fn()}
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByText('Reset to Original'));

    await waitFor(() => {
      expect(onReset).toHaveBeenCalledWith('node-1');
    });
  });

  it('should display error on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));

    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={onSave}
        onReset={vi.fn()}
      />
    );

    // Make a change to enable save
    const titleInput = screen.getByDisplayValue('User Action');
    fireEvent.change(titleInput, { target: { value: 'Changed' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('should disable save button when title is empty', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue('User Action');
    fireEvent.change(titleInput, { target: { value: '' } });

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('should close on Escape key', () => {
    const onClose = vi.fn();

    render(
      <NodeEditModal
        isOpen={true}
        node={mockNode}
        onClose={onClose}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const modal = screen.getByText('Edit Component').closest('div[class*="fixed"]');
    fireEvent.keyDown(modal!, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('should show modified badge when node is modified', () => {
    render(
      <NodeEditModal
        isOpen={true}
        node={modifiedNode}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByText('Modified')).toBeInTheDocument();
  });
});
