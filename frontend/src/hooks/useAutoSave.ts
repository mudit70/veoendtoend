import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAutoSaveOptions {
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Delay in milliseconds before auto-saving (default: 5000) */
  delay?: number;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save succeeds */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

export interface UseAutoSaveReturn {
  /** Whether currently auto-saving */
  isAutoSaving: boolean;
  /** Last auto-save timestamp */
  lastSaved: Date | null;
  /** Last error from auto-save */
  lastError: Error | null;
  /** Trigger an immediate save */
  saveNow: () => Promise<void>;
  /** Reset the auto-save timer */
  resetTimer: () => void;
  /** Cancel pending auto-save */
  cancel: () => void;
}

/**
 * Hook for auto-saving changes after a delay
 */
export function useAutoSave(
  hasChanges: boolean,
  onSave: () => Promise<void>,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    enabled = true,
    delay = 5000,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const savingRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveNow = useCallback(async () => {
    if (savingRef.current) return;

    cancel();
    savingRef.current = true;
    setIsAutoSaving(true);
    setLastError(null);
    onSaveStart?.();

    try {
      await onSave();
      setLastSaved(new Date());
      onSaveSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setLastError(err);
      onSaveError?.(err);
    } finally {
      savingRef.current = false;
      setIsAutoSaving(false);
    }
  }, [onSave, cancel, onSaveStart, onSaveSuccess, onSaveError]);

  const resetTimer = useCallback(() => {
    cancel();
    if (enabled && hasChanges) {
      timerRef.current = setTimeout(() => {
        saveNow();
      }, delay);
    }
  }, [enabled, hasChanges, delay, cancel, saveNow]);

  // Set up auto-save timer when changes occur
  useEffect(() => {
    if (enabled && hasChanges) {
      resetTimer();
    }

    return cancel;
  }, [enabled, hasChanges, resetTimer, cancel]);

  // Cancel timer when disabled
  useEffect(() => {
    if (!enabled) {
      cancel();
    }
  }, [enabled, cancel]);

  return {
    isAutoSaving,
    lastSaved,
    lastError,
    saveNow,
    resetTimer,
    cancel,
  };
}

export default useAutoSave;
