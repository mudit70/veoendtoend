import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import type { Project } from '@veoendtoend/shared';

const mockProject: Project = {
  id: 'test-123',
  name: 'Test Project',
  description: 'A test project description',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProjectCard', () => {
  it('should render project name', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should render project description', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);

    expect(screen.getByText('A test project description')).toBeInTheDocument();
  });

  it('should render created date', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
  });

  it('should link to project detail page', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/test-123');
  });

  it('should not render description when not provided', () => {
    const projectWithoutDescription = { ...mockProject, description: undefined };
    renderWithRouter(<ProjectCard project={projectWithoutDescription} />);

    expect(screen.queryByText('A test project description')).not.toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    window.confirm = vi.fn(() => true);

    renderWithRouter(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByTitle('Delete project');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('Delete project "Test Project"?');
    expect(onDelete).toHaveBeenCalledWith('test-123');
  });

  it('should not call onDelete when confirmation is cancelled', () => {
    const onDelete = vi.fn();
    window.confirm = vi.fn(() => false);

    renderWithRouter(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByTitle('Delete project');
    fireEvent.click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('should not show delete button when onDelete is not provided', () => {
    renderWithRouter(<ProjectCard project={mockProject} />);

    expect(screen.queryByTitle('Delete project')).not.toBeInTheDocument();
  });
});
