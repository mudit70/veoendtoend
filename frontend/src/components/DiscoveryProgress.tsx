import type { DiscoveryJob } from '../api/client';

interface DiscoveryProgressProps {
  job: DiscoveryJob | null;
  onDismiss?: () => void;
}

function DiscoveryProgress({ job, onDismiss }: DiscoveryProgressProps) {
  if (!job) return null;

  const getStatusColor = () => {
    switch (job.status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200';
      case 'FAILED':
        return 'bg-red-50 border-red-200';
      case 'RUNNING':
      case 'PENDING':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'COMPLETED':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'FAILED':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'RUNNING':
      case 'PENDING':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'PENDING':
        return 'Preparing discovery...';
      case 'RUNNING':
        return `Analyzing documents... ${Math.round(job.progress)}%`;
      case 'COMPLETED': {
        const result = job.result as { operationsCreated?: number; summary?: string } | undefined;
        return result?.operationsCreated !== undefined
          ? `Found ${result.operationsCreated} operation${result.operationsCreated !== 1 ? 's' : ''}`
          : 'Discovery completed';
      }
      case 'FAILED':
        return job.error || 'Discovery failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium text-gray-900">{getStatusText()}</p>
            {job.status === 'RUNNING' && (
              <div className="mt-2 w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            )}
            {job.status === 'COMPLETED' && job.result ? (
              <p className="text-sm text-gray-600 mt-1">
                {String((job.result as { summary?: string })?.summary ?? '')}
              </p>
            ) : null}
          </div>
        </div>
        {(job.status === 'COMPLETED' || job.status === 'FAILED') && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default DiscoveryProgress;
