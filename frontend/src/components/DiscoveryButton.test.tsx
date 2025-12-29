import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiscoveryButton from './DiscoveryButton';

describe('DiscoveryButton', () => {
  it('should render Discover Operations button', () => {
    render(
      <DiscoveryButton
        onStartDiscovery={vi.fn()}
        isDiscovering={false}
      />
    );

    expect(screen.getByText('Discover Operations')).toBeInTheDocument();
  });

  it('should trigger discovery on click', async () => {
    const onStartDiscovery = vi.fn().mockResolvedValue(undefined);

    render(
      <DiscoveryButton
        onStartDiscovery={onStartDiscovery}
        isDiscovering={false}
      />
    );

    fireEvent.click(screen.getByText('Discover Operations'));

    await waitFor(() => {
      expect(onStartDiscovery).toHaveBeenCalled();
    });
  });

  it('should show loading state during discovery', () => {
    render(
      <DiscoveryButton
        onStartDiscovery={vi.fn()}
        isDiscovering={true}
      />
    );

    expect(screen.getByText('Discovering...')).toBeInTheDocument();
  });

  it('should be disabled during discovery', () => {
    render(
      <DiscoveryButton
        onStartDiscovery={vi.fn()}
        isDiscovering={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <DiscoveryButton
        onStartDiscovery={vi.fn()}
        isDiscovering={false}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show error message on failure', async () => {
    const onStartDiscovery = vi.fn().mockRejectedValue(new Error('Discovery failed'));

    render(
      <DiscoveryButton
        onStartDiscovery={onStartDiscovery}
        isDiscovering={false}
      />
    );

    fireEvent.click(screen.getByText('Discover Operations'));

    await waitFor(() => {
      expect(screen.getByText('Discovery failed')).toBeInTheDocument();
    });
  });
});
