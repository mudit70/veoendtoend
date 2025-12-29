import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OperationModal from './OperationModal';
import type { Operation } from '@veoendtoend/shared';

describe('OperationModal', () => {
  const mockOperation: Operation = {
    id: 'op-1',
    projectId: 'project-1',
    name: 'Existing Operation',
    description: 'An existing operation',
    type: 'API_CALL',
    status: 'MANUAL',
    confidence: 1,
    sourceDocumentIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should not render when closed', () => {
    render(
      <OperationModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByText('Add Operation')).not.toBeInTheDocument();
  });

  it('should render add operation form when open', () => {
    render(
      <OperationModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Add Operation' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., User Login')).toBeInTheDocument();
  });

  it('should render edit form when operation is provided', () => {
    render(
      <OperationModal
        isOpen={true}
        operation={mockOperation}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Edit Operation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Operation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('An existing operation')).toBeInTheDocument();
  });

  it('should call onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(
      <OperationModal
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should disable submit button when name is empty', () => {
    render(
      <OperationModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Add Operation' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when name is provided', () => {
    render(
      <OperationModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g., User Login');
    fireEvent.change(nameInput, { target: { value: 'New Operation' } });

    const submitButton = screen.getByRole('button', { name: 'Add Operation' });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onSubmit with form data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <OperationModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g., User Login'), {
      target: { value: 'Test Op' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe what this operation does'), {
      target: { value: 'Test description' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'USER_INTERACTION' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Operation' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Op',
        description: 'Test description',
        type: 'USER_INTERACTION',
      });
    });
  });

  it('should show Save Changes button when editing', () => {
    render(
      <OperationModal
        isOpen={true}
        operation={mockOperation}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('should display error on submit failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'));

    render(
      <OperationModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g., User Login'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Operation' }));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('should show saving state during submit', async () => {
    const onSubmit = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <OperationModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g., User Login'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Operation' }));

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('should have all operation type options', () => {
    render(
      <OperationModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options.map(o => o.textContent)).toEqual([
      'User Interaction',
      'Client Operation',
      'API Call',
      'Data Flow',
    ]);
  });
});
