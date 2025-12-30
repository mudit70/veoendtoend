import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, type ValidationRun } from '../api/client';

interface UseValidationOptions {
  pollInterval?: number;
  onComplete?: (run: ValidationRun) => void;
  onError?: (error: Error) => void;
}

interface UseValidationReturn {
  isValidating: boolean;
  validationRun: ValidationRun | null;
  progress: number;
  error: string | null;
  startValidation: () => Promise<void>;
  cancelValidation: () => void;
}

export function useValidation(
  diagramId: string,
  options: UseValidationOptions = {}
): UseValidationReturn {
  const { pollInterval = 1000, onComplete, onError } = options;

  const [isValidating, setIsValidating] = useState(false);
  const [validationRun, setValidationRun] = useState<ValidationRun | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const validationIdRef = useRef<string | null>(null);
  const isCancelledRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (validationId: string) => {
    if (isCancelledRef.current) {
      clearPolling();
      return;
    }

    try {
      const response = await apiClient.getValidationStatus(validationId);

      if (!response.success || !response.data) {
        throw new Error('Failed to get validation status');
      }

      const run = response.data;
      setValidationRun(run);

      // Calculate progress
      if (run.totalComponents > 0) {
        setProgress((run.validatedComponents / run.totalComponents) * 100);
      }

      // Check if completed or failed
      if (run.status === 'COMPLETED' || run.status === 'FAILED') {
        clearPolling();
        setIsValidating(false);

        if (run.status === 'COMPLETED') {
          onComplete?.(run);
        } else {
          const err = new Error('Validation failed');
          setError(err.message);
          onError?.(err);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Polling failed');
      setError(error.message);
      clearPolling();
      setIsValidating(false);
      onError?.(error);
    }
  }, [clearPolling, onComplete, onError]);

  const startValidation = useCallback(async () => {
    if (isValidating) return;

    setIsValidating(true);
    setError(null);
    setProgress(0);
    setValidationRun(null);
    isCancelledRef.current = false;

    try {
      const response = await apiClient.startValidation(diagramId);

      if (!response.success || !response.data) {
        throw new Error('Failed to start validation');
      }

      const { validationId } = response.data;
      validationIdRef.current = validationId;

      // Start polling for status
      pollingRef.current = setInterval(() => {
        pollStatus(validationId);
      }, pollInterval);

      // Also poll immediately
      await pollStatus(validationId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start validation');
      setError(error.message);
      setIsValidating(false);
      onError?.(error);
    }
  }, [diagramId, isValidating, pollInterval, pollStatus, onError]);

  const cancelValidation = useCallback(() => {
    isCancelledRef.current = true;
    clearPolling();
    setIsValidating(false);
    setProgress(0);
    validationIdRef.current = null;
  }, [clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    isValidating,
    validationRun,
    progress,
    error,
    startValidation,
    cancelValidation,
  };
}
