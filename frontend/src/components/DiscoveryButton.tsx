import { useState } from 'react';

interface DiscoveryButtonProps {
  onStartDiscovery: () => Promise<void>;
  isDiscovering: boolean;
  disabled?: boolean;
}

function DiscoveryButton({ onStartDiscovery, isDiscovering, disabled }: DiscoveryButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setError(null);
      await onStartDiscovery();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start discovery');
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={disabled || isDiscovering}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
          ${isDiscovering
            ? 'bg-blue-100 text-blue-700 cursor-wait'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isDiscovering ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
            Discovering...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Discover Operations
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default DiscoveryButton;
