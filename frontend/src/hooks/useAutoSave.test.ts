import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not auto-save when disabled', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAutoSave(true, onSave, { enabled: false, delay: 1000 })
    );

    vi.advanceTimersByTime(2000);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should not auto-save when no changes', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAutoSave(false, onSave, { enabled: true, delay: 1000 })
    );

    vi.advanceTimersByTime(2000);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should auto-save after delay when enabled and has changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 1000 })
    );

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should update lastSaved on successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 1000 })
    );

    expect(result.current.lastSaved).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should set lastError on save failure', async () => {
    const error = new Error('Save failed');
    const onSave = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 1000 })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.lastError).toEqual(error);
  });

  it('should call onSaveStart before saving', async () => {
    const callOrder: string[] = [];
    const onSave = vi.fn().mockImplementation(() => {
      callOrder.push('save');
      return Promise.resolve();
    });
    const onSaveStart = vi.fn().mockImplementation(() => {
      callOrder.push('start');
    });

    renderHook(() =>
      useAutoSave(true, onSave, {
        enabled: true,
        delay: 1000,
        onSaveStart,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSaveStart).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['start', 'save']);
  });

  it('should call onSaveSuccess on success', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onSaveSuccess = vi.fn();

    renderHook(() =>
      useAutoSave(true, onSave, {
        enabled: true,
        delay: 1000,
        onSaveSuccess,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
  });

  it('should call onSaveError on failure', async () => {
    const error = new Error('Save failed');
    const onSave = vi.fn().mockRejectedValue(error);
    const onSaveError = vi.fn();

    renderHook(() =>
      useAutoSave(true, onSave, {
        enabled: true,
        delay: 1000,
        onSaveError,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSaveError).toHaveBeenCalledWith(error);
  });

  it('should set isAutoSaving during save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 1000 })
    );

    expect(result.current.isAutoSaving).toBe(false);

    // Trigger the timer
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // After completion, isAutoSaving should be false
    expect(onSave).toHaveBeenCalled();
  });

  it('should allow immediate save via saveNow', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 5000 })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should cancel pending save via cancel', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 1000 })
    );

    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should reset timer via resetTimer', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave(true, onSave, { enabled: true, delay: 1000 })
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.resetTimer();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should use default delay of 5000ms', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAutoSave(true, onSave, { enabled: true })
    );

    await act(async () => {
      vi.advanceTimersByTime(4999);
    });

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
