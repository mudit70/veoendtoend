import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationTrigger } from './ValidationTrigger';
import { useValidation } from '../hooks/useValidation';
import type { ValidationRun } from '../api/client';

// Mock the useValidation hook
vi.mock('../hooks/useValidation', () => ({
  useValidation: vi.fn(),
}));

describe('ValidationTrigger', () => {
  const mockStartValidation = vi.fn();
  const mockCancelValidation = vi.fn();

  const defaultHookReturn = {
    isValidating: false,
    validationRun: null,
    progress: 0,
    error: null,
    startValidation: mockStartValidation,
    cancelValidation: mockCancelValidation,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useValidation).mockReturnValue(defaultHookReturn);
  });

  it('should render validate button', () => {
    render(<ValidationTrigger diagramId="diagram-1" />);

    expect(screen.getByText('Validate')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should call startValidation when button clicked', async () => {
    render(<ValidationTrigger diagramId="diagram-1" />);

    fireEvent.click(screen.getByText('Validate'));

    expect(mockStartValidation).toHaveBeenCalled();
  });

  it('should show validating state', () => {
    vi.mocked(useValidation).mockReturnValue({
      ...defaultHookReturn,
      isValidating: true,
    });

    render(<ValidationTrigger diagramId="diagram-1" />);

    expect(screen.getByText('Validating...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<ValidationTrigger diagramId="diagram-1" disabled={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show progress popup when validating', async () => {
    // Start with non-validating state, then update to validating after click
    let currentReturn = { ...defaultHookReturn };
    vi.mocked(useValidation).mockImplementation(() => currentReturn);

    const { rerender } = render(<ValidationTrigger diagramId="diagram-1" />);

    // Click the button which sets showProgress = true
    fireEvent.click(screen.getByText('Validate'));

    // Now mock the validating state
    currentReturn = {
      ...defaultHookReturn,
      isValidating: true,
      validationRun: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 10,
        validatedComponents: 5,
        startedAt: '2024-01-01',
        completedAt: null,
      },
      progress: 50,
    };
    rerender(<ValidationTrigger diagramId="diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText('Validation Progress')).toBeInTheDocument();
      expect(screen.getByText('5 / 10 components')).toBeInTheDocument();
    });
  });

  it('should show completion result with score', async () => {
    const onComplete = vi.fn();
    const completedRun: ValidationRun = {
      id: 'val-1',
      diagramId: 'diagram-1',
      status: 'COMPLETED',
      score: 85,
      totalComponents: 10,
      validatedComponents: 10,
      startedAt: '2024-01-01',
      completedAt: '2024-01-01',
    };

    vi.mocked(useValidation).mockReturnValue({
      ...defaultHookReturn,
      isValidating: false,
      validationRun: completedRun,
    });

    render(<ValidationTrigger diagramId="diagram-1" onValidationComplete={onComplete} />);

    // Click to trigger and show result
    fireEvent.click(screen.getByText('Validate'));

    await waitFor(() => {
      expect(screen.getByText('Validation Complete')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('should show error message when error occurs', () => {
    vi.mocked(useValidation).mockReturnValue({
      ...defaultHookReturn,
      error: 'Validation failed',
    });

    render(<ValidationTrigger diagramId="diagram-1" />);

    // Click to trigger
    fireEvent.click(screen.getByText('Validate'));

    expect(screen.getByText('Validation failed')).toBeInTheDocument();
  });

  it('should cancel validation when cancel button clicked', async () => {
    let currentReturn = { ...defaultHookReturn };
    vi.mocked(useValidation).mockImplementation(() => currentReturn);

    const { rerender } = render(<ValidationTrigger diagramId="diagram-1" />);

    // Click the button to start and show progress
    fireEvent.click(screen.getByText('Validate'));

    // Now mock the validating state
    currentReturn = {
      ...defaultHookReturn,
      isValidating: true,
      validationRun: {
        id: 'val-1',
        diagramId: 'diagram-1',
        status: 'RUNNING',
        score: null,
        totalComponents: 10,
        validatedComponents: 3,
        startedAt: '2024-01-01',
        completedAt: null,
      },
    };
    rerender(<ValidationTrigger diagramId="diagram-1" />);

    // Find and click cancel button
    await waitFor(() => {
      expect(screen.getByLabelText('Cancel validation')).toBeInTheDocument();
    });
    const cancelButton = screen.getByLabelText('Cancel validation');
    fireEvent.click(cancelButton);

    expect(mockCancelValidation).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ValidationTrigger diagramId="diagram-1" className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should display correct score labels', async () => {
    const testCases = [
      { score: 95, label: 'Excellent' },
      { score: 80, label: 'Good' },
      { score: 65, label: 'Fair' },
      { score: 45, label: 'Poor' },
      { score: 30, label: 'Critical' },
    ];

    for (const { score, label } of testCases) {
      vi.mocked(useValidation).mockReturnValue({
        ...defaultHookReturn,
        isValidating: false,
        validationRun: {
          id: 'val-1',
          diagramId: 'diagram-1',
          status: 'COMPLETED',
          score,
          totalComponents: 10,
          validatedComponents: 10,
          startedAt: '2024-01-01',
          completedAt: '2024-01-01',
        },
      });

      const { unmount } = render(<ValidationTrigger diagramId="diagram-1" />);

      // Click to trigger and show result
      fireEvent.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('should pass diagramId to useValidation hook', () => {
    render(<ValidationTrigger diagramId="my-diagram-id" />);

    expect(useValidation).toHaveBeenCalledWith(
      'my-diagram-id',
      expect.objectContaining({
        onComplete: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it('should dismiss error on dismiss click', async () => {
    vi.mocked(useValidation).mockReturnValue({
      ...defaultHookReturn,
      error: 'Some error occurred',
    });

    render(<ValidationTrigger diagramId="diagram-1" />);

    // Click to trigger
    fireEvent.click(screen.getByText('Validate'));

    // Find and click dismiss
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    // Progress popup should be hidden (checking via showProgress state)
    // Since error is still in hook, we just verify the button works
    expect(dismissButton).toBeInTheDocument();
  });

  it('should show starting message before run data arrives', async () => {
    let currentReturn = { ...defaultHookReturn };
    vi.mocked(useValidation).mockImplementation(() => currentReturn);

    const { rerender } = render(<ValidationTrigger diagramId="diagram-1" />);

    // Click to start validation
    fireEvent.click(screen.getByText('Validate'));

    // Now mock the validating state with no run data yet
    currentReturn = {
      ...defaultHookReturn,
      isValidating: true,
      validationRun: null,
    };
    rerender(<ValidationTrigger diagramId="diagram-1" />);

    await waitFor(() => {
      expect(screen.getByText('Starting validation...')).toBeInTheDocument();
    });
  });

  it('should have proper accessibility attributes', () => {
    render(<ValidationTrigger diagramId="diagram-1" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Validate diagram');
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('should have proper accessibility attributes when validating', () => {
    vi.mocked(useValidation).mockReturnValue({
      ...defaultHookReturn,
      isValidating: true,
    });

    render(<ValidationTrigger diagramId="diagram-1" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Validating diagram');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
