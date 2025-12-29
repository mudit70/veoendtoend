import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewProjectModal from './NewProjectModal';

describe('NewProjectModal', () => {
  it('should not render when isOpen is false', () => {
    render(
      <NewProjectModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByText(/Project Name/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <NewProjectModal
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalled();
  });

  it('should disable Create button when name is empty', () => {
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const createButton = screen.getByText('Create Project');
    expect(createButton).toBeDisabled();
  });

  it('should enable Create button when name is provided', () => {
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(nameInput, { target: { value: 'My Project' } });

    const createButton = screen.getByText('Create Project');
    expect(createButton).not.toBeDisabled();
  });

  it('should call onSubmit with name and description on form submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <NewProjectModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter project name');
    const descInput = screen.getByPlaceholderText('Optional description');

    fireEvent.change(nameInput, { target: { value: 'Test Project' } });
    fireEvent.change(descInput, { target: { value: 'A description' } });
    fireEvent.click(screen.getByText('Create Project'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Test Project', 'A description');
    });
  });

  it('should call onSubmit with undefined description when not provided', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(nameInput, { target: { value: 'Test Project' } });
    fireEvent.click(screen.getByText('Create Project'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Test Project', undefined);
    });
  });

  it('should display error when onSubmit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create Project'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should show Creating... text while submitting', async () => {
    const onSubmit = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create Project'));

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  it('should clear form and close modal on successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <NewProjectModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create Project'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
