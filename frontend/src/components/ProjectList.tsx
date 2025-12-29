import type { Project } from '@veoendtoend/shared';
import ProjectCard from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  onCreateClick?: () => void;
  onDeleteProject?: (projectId: string) => void;
}

function ProjectList({ projects, loading, onCreateClick, onDeleteProject }: ProjectListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <svg
          className="mx-auto h-12 w-12 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="text-gray-500 mb-4">No projects yet</p>
        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className="text-blue-600 hover:underline"
          >
            Create your first project
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={onDeleteProject}
        />
      ))}
    </div>
  );
}

export default ProjectList;
