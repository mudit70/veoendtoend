import { Link } from 'react-router-dom';
import type { Project } from '@veoendtoend/shared';

interface ProjectCardProps {
  project: Project;
  onDelete?: (projectId: string) => void;
}

function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm(`Delete project "${project.name}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow block relative group"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-2">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
          )}
          <p className="text-gray-400 text-xs">
            Created: {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600"
            title="Delete project"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </Link>
  );
}

export default ProjectCard;
