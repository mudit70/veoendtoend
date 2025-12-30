import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveWithRetry } from './useSaveWithRetry';

describe('useSaveWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return success on first attempt', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSaveWithRetry(onSave));

    let success: boolean;
    await act(async () => {
      success = await result.current.save();
    });

    expect(success!).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('should retry on failure', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 3, retryDelay: 100 })
    );

    await act(async () => {
      const savePromise = result.current.save();
      await vi.advanceTimersByTimeAsync(100);
      await savePromise;
    });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('should set error after max retries', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Always fails'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 2, retryDelay: 100 })
    );

    await act(async () => {
      const savePromise = result.current.save();
      await vi.advanceTimersByTimeAsync(300);
      await savePromise;
    });

    expect(onSave).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Always fails');
  });

  it('should call onMaxRetriesReached when retries exhausted', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'));
    const onMaxRetriesReached = vi.fn();

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, {
        maxRetries: 1,
        retryDelay: 100,
        onMaxRetriesReached,
      })
    );

    await act(async () => {
      const savePromise = result.current.save();
      await vi.advanceTimersByTimeAsync(200);
      await savePromise;
    });

    expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
    expect(onMaxRetriesReached).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'fail',
        retryable: true,
      })
    );
  });

  it('should set isSaving during save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useSaveWithRetry(onSave));

    expect(result.current.isSaving).toBe(false);

    await act(async () => {
      await result.current.save();
    });

    // After save, isSaving should be false
    expect(result.current.isSaving).toBe(false);
    expect(onSave).toHaveBeenCalled();
  });

  it('should track retry count', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 3, retryDelay: 100 })
    );

    await act(async () => {
      const savePromise = result.current.save();
      await vi.advanceTimersByTimeAsync(200);
      await savePromise;
    });

    expect(result.current.retryCount).toBe(0); // Reset on success
  });

  it('should clear error with clearError', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 0, retryDelay: 0 })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('should dismiss error with dismissError', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 0, retryDelay: 0 })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should detect network errors', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 0 })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error?.code).toBe('NETWORK_ERROR');
  });

  it('should detect auth errors', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('401 unauthorized'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 0 })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error?.code).toBe('AUTH_ERROR');
    expect(result.current.error?.retryable).toBe(false);
  });

  it('should detect conflict errors', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('conflict detected'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { maxRetries: 0 })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error?.code).toBe('CONFLICT');
  });

  it('should use default maxRetries of 3', async () => {
    vi.useRealTimers(); // Use real timers for this test due to retryDelay: 0
    const onSave = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() =>
      useSaveWithRetry(onSave, { retryDelay: 0 })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(onSave).toHaveBeenCalledTimes(4); // 1 + 3 retries
  });
});
