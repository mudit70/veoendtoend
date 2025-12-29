import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectList from './ProjectList';
import type { Project } from '@veoendtoend/shared';

const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'First Project',
    description: 'Description for first project',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'project-2',
    name: 'Second Project',
    createdAt: '2024-01-16T10:30:00Z',
    updatedAt: '2024-01-16T10:30:00Z',
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProjectList', () => {
  it('should display loading state', () => {
    renderWithRouter(<ProjectList projects={[]} loading={true} />);

    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('should display projects', () => {
    renderWithRouter(<ProjectList projects={mockProjects} />);

    expect(screen.getByText('First Project')).toBeInTheDocument();
    expect(screen.getByText('Second Project')).toBeInTheDocument();
  });

  it('should show empty state when no projects', () => {
    renderWithRouter(<ProjectList projects={[]} />);

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  it('should show create button in empty state when onCreateClick provided', () => {
    const onCreateClick = vi.fn();
    renderWithRouter(<ProjectList projects={[]} onCreateClick={onCreateClick} />);

    const createButton = screen.getByText('Create your first project');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(onCreateClick).toHaveBeenCalled();
  });

  it('should render project descriptions', () => {
    renderWithRouter(<ProjectList projects={mockProjects} />);

    expect(screen.getByText('Description for first project')).toBeInTheDocument();
  });

  it('should link to project detail pages', () => {
    renderWithRouter(<ProjectList projects={mockProjects} />);

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/projects/project-1');
    expect(links[1]).toHaveAttribute('href', '/projects/project-2');
  });

  it('should call onDeleteProject when delete is triggered', () => {
    const onDeleteProject = vi.fn();
    window.confirm = vi.fn(() => true);

    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={onDeleteProject} />
    );

    const deleteButtons = screen.getAllByTitle('Delete project');
    fireEvent.click(deleteButtons[0]);

    expect(onDeleteProject).toHaveBeenCalledWith('project-1');
  });

  it('should not render create button in empty state when onCreateClick not provided', () => {
    renderWithRouter(<ProjectList projects={[]} />);

    expect(screen.queryByText('Create your first project')).not.toBeInTheDocument();
  });
});
