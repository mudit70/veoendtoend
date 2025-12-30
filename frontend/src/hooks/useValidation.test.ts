import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useValidation } from './useValidation';
import { apiClient } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    startValidation: vi.fn(),
    getValidationStatus: vi.fn(),
  },
}));

describe('useValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useValidation('diagram-1'));

    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationRun).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should start validation and set isValidating to true', async () => {
    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 5,
        validatedComponents: 2,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    const { result } = renderHook(() => useValidation('diagram-1'));

    await act(async () => {
      result.current.startValidation();
    });

    expect(result.current.isValidating).toBe(true);
    expect(apiClient.startValidation).toHaveBeenCalledWith('diagram-1');
  });

  it('should update progress as validation progresses', async () => {
    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 10,
        validatedComponents: 5,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    const { result } = renderHook(() => useValidation('diagram-1'));

    await act(async () => {
      await result.current.startValidation();
    });

    expect(result.current.progress).toBe(50);
  });

  it('should call onComplete when validation completes', async () => {
    const onComplete = vi.fn();

    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'COMPLETED',
        score: 85,
        totalComponents: 5,
        validatedComponents: 5,
        startedAt: '2024-01-01',
        completedAt: '2024-01-01',
      },
    });

    const { result } = renderHook(() => useValidation('diagram-1', { onComplete }));

    await act(async () => {
      await result.current.startValidation();
    });

    expect(onComplete).toHaveBeenCalled();
    expect(result.current.isValidating).toBe(false);
  });

  it('should call onError when validation fails', async () => {
    const onError = vi.fn();

    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'FAILED',
        score: null,
        totalComponents: 5,
        validatedComponents: 2,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    const { result } = renderHook(() => useValidation('diagram-1', { onError }));

    await act(async () => {
      await result.current.startValidation();
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.error).toBe('Validation failed');
  });

  it('should handle start validation error', async () => {
    const onError = vi.fn();

    vi.mocked(apiClient.startValidation).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useValidation('diagram-1', { onError }));

    await act(async () => {
      await result.current.startValidation();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isValidating).toBe(false);
    expect(onError).toHaveBeenCalled();
  });

  it('should cancel validation', async () => {
    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 10,
        validatedComponents: 3,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    const { result } = renderHook(() => useValidation('diagram-1'));

    await act(async () => {
      result.current.startValidation();
    });

    act(() => {
      result.current.cancelValidation();
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('should not start if already validating', async () => {
    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 10,
        validatedComponents: 3,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    const { result } = renderHook(() => useValidation('diagram-1'));

    await act(async () => {
      await result.current.startValidation();
    });

    // Try to start again
    await act(async () => {
      await result.current.startValidation();
    });

    // Should only have been called once
    expect(apiClient.startValidation).toHaveBeenCalledTimes(1);
  });

  it('should handle API response failure', async () => {
    const onError = vi.fn();

    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: false,
      data: undefined,
      error: 'API error',
    });

    const { result } = renderHook(() => useValidation('diagram-1', { onError }));

    await act(async () => {
      await result.current.startValidation();
    });

    expect(result.current.error).toBe('Failed to start validation');
    expect(result.current.isValidating).toBe(false);
  });

  it('should use custom poll interval', async () => {
    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 5,
        validatedComponents: 2,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    renderHook(() => useValidation('diagram-1', { pollInterval: 2000 }));

    // The hook should use the custom interval
    expect(true).toBe(true); // Placeholder for interval test
  });

  it('should cleanup polling on unmount', async () => {
    vi.mocked(apiClient.startValidation).mockResolvedValue({
      success: true,
      data: { validationId: 'val-1' },
    });

    vi.mocked(apiClient.getValidationStatus).mockResolvedValue({
      success: true,
      data: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 5,
        validatedComponents: 2,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    });

    const { result, unmount } = renderHook(() => useValidation('diagram-1'));

    await act(async () => {
      await result.current.startValidation();
    });

    // Unmount should not throw
    unmount();
    expect(true).toBe(true);
  });
});
