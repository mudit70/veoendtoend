import { useState, useCallback } from 'react';

export interface SaveError {
  message: string;
  code?: string;
  retryable: boolean;
  timestamp: Date;
}

export interface UseSaveWithRetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Callback when all retries are exhausted */
  onMaxRetriesReached?: (error: SaveError) => void;
}

export interface UseSaveWithRetryReturn {
  /** Whether save is in progress */
  isSaving: boolean;
  /** Current error if any */
  error: SaveError | null;
  /** Number of retry attempts made */
  retryCount: number;
  /** Perform save with retry logic */
  save: () => Promise<boolean>;
  /** Clear current error */
  clearError: () => void;
  /** Dismiss error (for UI) */
  dismissError: () => void;
}

/**
 * Hook for saving with automatic retry on failure
 */
export function useSaveWithRetry(
  onSave: () => Promise<void>,
  options: UseSaveWithRetryOptions = {}
): UseSaveWithRetryReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onMaxRetriesReached,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= maxRetries) {
      try {
        await onSave();
        setRetryCount(0);
        setIsSaving(false);
        return true;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempts++;
        setRetryCount(attempts);

        if (attempts <= maxRetries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries exhausted
    const saveError: SaveError = {
      message: lastError?.message || 'Save failed',
      retryable: true,
      timestamp: new Date(),
    };

    // Check for specific error types
    if (lastError?.message?.includes('network')) {
      saveError.code = 'NETWORK_ERROR';
    } else if (lastError?.message?.includes('401') || lastError?.message?.includes('unauthorized')) {
      saveError.code = 'AUTH_ERROR';
      saveError.retryable = false;
    } else if (lastError?.message?.includes('conflict')) {
      saveError.code = 'CONFLICT';
    }

    setError(saveError);
    setIsSaving(false);
    onMaxRetriesReached?.(saveError);

    return false;
  }, [onSave, maxRetries, retryDelay, onMaxRetriesReached]);

  return {
    isSaving,
    error,
    retryCount,
    save,
    clearError,
    dismissError,
  };
}

export default useSaveWithRetry;
