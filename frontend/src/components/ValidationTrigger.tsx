import { useState, useCallback } from 'react';
import { useValidation } from '../hooks/useValidation';
import type { ValidationRun } from '../api/client';

interface ValidationTriggerProps {
  diagramId: string;
  onValidationComplete?: (run: ValidationRun) => void;
  disabled?: boolean;
  className?: string;
}

export function ValidationTrigger({
  diagramId,
  onValidationComplete,
  disabled = false,
  className = '',
}: ValidationTriggerProps) {
  const [showProgress, setShowProgress] = useState(false);

  const handleComplete = useCallback((run: ValidationRun) => {
    setShowProgress(false);
    onValidationComplete?.(run);
  }, [onValidationComplete]);

  const {
    isValidating,
    validationRun,
    progress,
    error,
    startValidation,
    cancelValidation,
  } = useValidation(diagramId, {
    onComplete: handleComplete,
    onError: () => setShowProgress(false),
  });

  const handleClick = async () => {
    setShowProgress(true);
    await startValidation();
  };

  const handleCancel = () => {
    cancelValidation();
    setShowProgress(false);
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number | null): string => {
    if (score === null) return 'N/A';
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <button
        onClick={handleClick}
        disabled={disabled || isValidating}
        aria-busy={isValidating}
        aria-label={isValidating ? 'Validating diagram' : 'Validate diagram'}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
          ${isValidating
            ? 'bg-purple-100 text-purple-700 cursor-wait'
            : 'bg-purple-600 text-white hover:bg-purple-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isValidating ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>Validating...</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Validate</span>
          </>
        )}
      </button>

      {/* Progress Popup */}
      {showProgress && isValidating && (
        <div
          className="absolute top-full mt-2 left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
          role="status"
          aria-live="polite"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Validation Progress</span>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cancel validation"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="text-xs text-gray-500">
            {validationRun ? (
              <span>
                {validationRun.validatedComponents} / {validationRun.totalComponents} components
              </span>
            ) : (
              <span>Starting validation...</span>
            )}
          </div>
        </div>
      )}

      {/* Completion Result */}
      {showProgress && validationRun?.status === 'COMPLETED' && (
        <div
          className="absolute top-full mt-2 left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
          role="alert"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">Validation Complete</span>
            <button
              onClick={() => setShowProgress(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(validationRun.score)}`}>
              {validationRun.score !== null ? `${Math.round(validationRun.score)}%` : 'N/A'}
            </div>
            <div className={`text-sm ${getScoreColor(validationRun.score)}`}>
              {getScoreLabel(validationRun.score)}
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            {validationRun.totalComponents} components validated
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="absolute top-full mt-2 left-0 w-64 bg-red-50 rounded-lg border border-red-200 p-3 z-50"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setShowProgress(false)}
                className="text-xs text-red-600 hover:text-red-800 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ValidationTrigger;
