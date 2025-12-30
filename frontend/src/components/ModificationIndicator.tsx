import React from 'react';

export interface ModificationIndicatorProps {
  /** Whether the item has been modified */
  isModified: boolean;
  /** Type of modification indicator */
  variant?: 'badge' | 'dot' | 'icon';
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show tooltip on hover */
  showTooltip?: boolean;
}

/**
 * Visual indicator for modified items
 */
export function ModificationIndicator({
  isModified,
  variant = 'badge',
  size = 'sm',
  className = '',
  showTooltip = true,
}: ModificationIndicatorProps) {
  if (!isModified) {
    return null;
  }

  const sizeClasses = {
    sm: {
      badge: 'text-xs px-1.5 py-0.5',
      dot: 'w-2 h-2',
      icon: 'w-3 h-3',
    },
    md: {
      badge: 'text-sm px-2 py-0.5',
      dot: 'w-2.5 h-2.5',
      icon: 'w-4 h-4',
    },
    lg: {
      badge: 'text-base px-2.5 py-1',
      dot: 'w-3 h-3',
      icon: 'w-5 h-5',
    },
  };

  const baseProps = {
    className: `modification-indicator ${className}`,
    title: showTooltip ? 'Modified by user' : undefined,
  };

  if (variant === 'badge') {
    return (
      <span
        {...baseProps}
        className={`modification-indicator inline-flex items-center rounded font-medium bg-yellow-100 text-yellow-800 ${sizeClasses[size].badge} ${className}`}
      >
        Modified
      </span>
    );
  }

  if (variant === 'dot') {
    return (
      <span
        {...baseProps}
        className={`modification-indicator inline-block rounded-full bg-yellow-500 ${sizeClasses[size].dot} ${className}`}
        aria-label="Modified"
      />
    );
  }

  // Icon variant
  return (
    <svg
      {...baseProps}
      className={`modification-indicator text-yellow-500 ${sizeClasses[size].icon} ${className}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-label="Modified"
    >
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

/**
 * Position change indicator for nodes that have been moved
 */
export interface PositionChangeIndicatorProps {
  /** Whether the position has changed */
  hasPositionChange: boolean;
  /** Original position */
  originalPosition?: { x: number; y: number };
  /** Current position */
  currentPosition?: { x: number; y: number };
  /** Additional CSS classes */
  className?: string;
}

export function PositionChangeIndicator({
  hasPositionChange,
  originalPosition,
  currentPosition,
  className = '',
}: PositionChangeIndicatorProps) {
  if (!hasPositionChange) {
    return null;
  }

  const deltaX = currentPosition && originalPosition
    ? Math.round(currentPosition.x - originalPosition.x)
    : 0;
  const deltaY = currentPosition && originalPosition
    ? Math.round(currentPosition.y - originalPosition.y)
    : 0;

  return (
    <span
      className={`position-change-indicator inline-flex items-center gap-1 text-xs text-blue-600 ${className}`}
      title={`Position changed by (${deltaX}, ${deltaY})`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
      Moved
    </span>
  );
}

export default ModificationIndicator;
