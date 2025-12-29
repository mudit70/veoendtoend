import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscoveryProgress from './DiscoveryProgress';
import type { DiscoveryJob } from '../api/client';

describe('DiscoveryProgress', () => {
  const baseJob: DiscoveryJob = {
    id: 'job-1',
    projectId: 'project-1',
    type: 'DISCOVERY',
    status: 'PENDING',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should not render when job is null', () => {
    const { container } = render(<DiscoveryProgress job={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should show pending state', () => {
    render(<DiscoveryProgress job={{ ...baseJob, status: 'PENDING' }} />);
    expect(screen.getByText('Preparing discovery...')).toBeInTheDocument();
  });

  it('should show running state with progress', () => {
    render(<DiscoveryProgress job={{ ...baseJob, status: 'RUNNING', progress: 45 }} />);
    expect(screen.getByText('Analyzing documents... 45%')).toBeInTheDocument();
  });

  it('should show completed state with operation count', () => {
    render(
      <DiscoveryProgress
        job={{
          ...baseJob,
          status: 'COMPLETED',
          progress: 100,
          result: { operationsCreated: 5, summary: 'Analysis complete' },
        }}
      />
    );
    expect(screen.getByText('Found 5 operations')).toBeInTheDocument();
    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
  });

  it('should show singular operation when count is 1', () => {
    render(
      <DiscoveryProgress
        job={{
          ...baseJob,
          status: 'COMPLETED',
          progress: 100,
          result: { operationsCreated: 1, summary: 'One operation' },
        }}
      />
    );
    expect(screen.getByText('Found 1 operation')).toBeInTheDocument();
  });

  it('should show failed state with error', () => {
    render(
      <DiscoveryProgress
        job={{
          ...baseJob,
          status: 'FAILED',
          error: 'LLM error occurred',
        }}
      />
    );
    expect(screen.getByText('LLM error occurred')).toBeInTheDocument();
  });

  it('should show dismiss button when completed', () => {
    const onDismiss = vi.fn();
    render(
      <DiscoveryProgress
        job={{ ...baseJob, status: 'COMPLETED', progress: 100, result: {} }}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show dismiss button when failed', () => {
    const onDismiss = vi.fn();
    render(
      <DiscoveryProgress
        job={{ ...baseJob, status: 'FAILED', error: 'Error' }}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should not show dismiss button when running', () => {
    render(
      <DiscoveryProgress
        job={{ ...baseJob, status: 'RUNNING', progress: 50 }}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should show progress bar when running', () => {
    const { container } = render(
      <DiscoveryProgress
        job={{ ...baseJob, status: 'RUNNING', progress: 70 }}
      />
    );

    const progressBar = container.querySelector('[style*="width: 70%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should show summary when completed', () => {
    render(
      <DiscoveryProgress
        job={{
          ...baseJob,
          status: 'COMPLETED',
          progress: 100,
          result: { operationsCreated: 3, summary: 'Analyzed 5 documents and found 3 operations' },
        }}
      />
    );
    expect(screen.getByText('Analyzed 5 documents and found 3 operations')).toBeInTheDocument();
  });
});
