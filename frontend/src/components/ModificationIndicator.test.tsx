import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModificationIndicator, PositionChangeIndicator } from './ModificationIndicator';

describe('ModificationIndicator', () => {
  it('should not render when not modified', () => {
    const { container } = render(<ModificationIndicator isModified={false} />);
    expect(container.querySelector('.modification-indicator')).toBeNull();
  });

  it('should render badge variant by default', () => {
    render(<ModificationIndicator isModified={true} />);
    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('should render dot variant', () => {
    const { container } = render(
      <ModificationIndicator isModified={true} variant="dot" />
    );
    const dot = container.querySelector('.modification-indicator');
    expect(dot).toBeInTheDocument();
    expect(dot?.getAttribute('aria-label')).toBe('Modified');
  });

  it('should render icon variant', () => {
    const { container } = render(
      <ModificationIndicator isModified={true} variant="icon" />
    );
    const icon = container.querySelector('svg.modification-indicator');
    expect(icon).toBeInTheDocument();
    expect(icon?.getAttribute('aria-label')).toBe('Modified');
  });

  it('should show tooltip by default', () => {
    render(<ModificationIndicator isModified={true} />);
    const indicator = screen.getByText('Modified');
    expect(indicator.getAttribute('title')).toBe('Modified by user');
  });

  it('should hide tooltip when showTooltip is false', () => {
    render(<ModificationIndicator isModified={true} showTooltip={false} />);
    const indicator = screen.getByText('Modified');
    expect(indicator.getAttribute('title')).toBeNull();
  });

  it('should apply small size classes', () => {
    render(<ModificationIndicator isModified={true} size="sm" />);
    const indicator = screen.getByText('Modified');
    expect(indicator.className).toContain('text-xs');
  });

  it('should apply medium size classes', () => {
    render(<ModificationIndicator isModified={true} size="md" />);
    const indicator = screen.getByText('Modified');
    expect(indicator.className).toContain('text-sm');
  });

  it('should apply large size classes', () => {
    render(<ModificationIndicator isModified={true} size="lg" />);
    const indicator = screen.getByText('Modified');
    expect(indicator.className).toContain('text-base');
  });

  it('should apply custom className', () => {
    render(<ModificationIndicator isModified={true} className="custom-class" />);
    const indicator = screen.getByText('Modified');
    expect(indicator.className).toContain('custom-class');
  });

  it('should have yellow background styling', () => {
    render(<ModificationIndicator isModified={true} />);
    const indicator = screen.getByText('Modified');
    expect(indicator.className).toContain('bg-yellow-100');
    expect(indicator.className).toContain('text-yellow-800');
  });
});

describe('PositionChangeIndicator', () => {
  it('should not render when no position change', () => {
    const { container } = render(
      <PositionChangeIndicator hasPositionChange={false} />
    );
    expect(container.querySelector('.position-change-indicator')).toBeNull();
  });

  it('should render when position has changed', () => {
    render(<PositionChangeIndicator hasPositionChange={true} />);
    expect(screen.getByText('Moved')).toBeInTheDocument();
  });

  it('should show delta in tooltip', () => {
    render(
      <PositionChangeIndicator
        hasPositionChange={true}
        originalPosition={{ x: 0, y: 0 }}
        currentPosition={{ x: 100, y: 50 }}
      />
    );
    const indicator = screen.getByText('Moved').closest('span');
    expect(indicator?.getAttribute('title')).toBe('Position changed by (100, 50)');
  });

  it('should apply custom className', () => {
    render(
      <PositionChangeIndicator hasPositionChange={true} className="custom-class" />
    );
    const indicator = screen.getByText('Moved').closest('span');
    expect(indicator?.className).toContain('custom-class');
  });

  it('should have blue text styling', () => {
    render(<PositionChangeIndicator hasPositionChange={true} />);
    const indicator = screen.getByText('Moved').closest('span');
    expect(indicator?.className).toContain('text-blue-600');
  });

  it('should handle missing positions gracefully', () => {
    render(
      <PositionChangeIndicator
        hasPositionChange={true}
        originalPosition={undefined}
        currentPosition={undefined}
      />
    );
    const indicator = screen.getByText('Moved').closest('span');
    expect(indicator?.getAttribute('title')).toBe('Position changed by (0, 0)');
  });
});
