import type { ValidationStatus } from '../api/client';

interface ValidationBadgeProps {
  status: ValidationStatus;
  score?: number | null;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const statusConfigs: Record<ValidationStatus, StatusConfig> = {
  VALID: {
    label: 'Valid',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  WARNING: {
    label: 'Warning',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  INVALID: {
    label: 'Invalid',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  UNVERIFIABLE: {
    label: 'Unverifiable',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  STALE: {
    label: 'Stale',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function ValidationBadge({
  status,
  score,
  showScore = false,
  size = 'md',
  className = '',
}: ValidationBadgeProps) {
  const config = statusConfigs[status];

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label={`Validation status: ${config.label}`}
    >
      <span className={iconSizeClasses[size]}>{config.icon}</span>
      <span>{config.label}</span>
      {showScore && score !== null && score !== undefined && (
        <span className="ml-1">({Math.round(score)}%)</span>
      )}
    </span>
  );
}

interface ValidationScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ValidationScoreBadge({
  score,
  size = 'md',
  className = '',
}: ValidationScoreBadgeProps) {
  const getScoreConfig = (score: number) => {
    if (score >= 90) return { bgColor: 'bg-green-100', textColor: 'text-green-800', label: 'Excellent' };
    if (score >= 75) return { bgColor: 'bg-blue-100', textColor: 'text-blue-800', label: 'Good' };
    if (score >= 60) return { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', label: 'Fair' };
    if (score >= 40) return { bgColor: 'bg-orange-100', textColor: 'text-orange-800', label: 'Poor' };
    return { bgColor: 'bg-red-100', textColor: 'text-red-800', label: 'Critical' };
  };

  const config = getScoreConfig(score);

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label={`Validation score: ${Math.round(score)}% (${config.label})`}
    >
      <span className="font-bold">{Math.round(score)}%</span>
      <span className="ml-1">{config.label}</span>
    </span>
  );
}

interface ValidationSummaryBadgeProps {
  validCount: number;
  warningCount: number;
  invalidCount: number;
  totalCount: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ValidationSummaryBadge({
  validCount,
  warningCount,
  invalidCount,
  totalCount,
  size = 'md',
  className = '',
}: ValidationSummaryBadgeProps) {
  const getOverallStatus = (): { bgColor: string; textColor: string } => {
    if (invalidCount > 0) return { bgColor: 'bg-red-100', textColor: 'text-red-800' };
    if (warningCount > 0) return { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    return { bgColor: 'bg-green-100', textColor: 'text-green-800' };
  };

  const config = getOverallStatus();

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label={`Validation summary: ${validCount} valid, ${warningCount} warnings, ${invalidCount} invalid out of ${totalCount} total`}
    >
      <span className="text-green-600">{validCount}</span>
      <span className="mx-0.5">/</span>
      {warningCount > 0 && (
        <>
          <span className="text-yellow-600">{warningCount}</span>
          <span className="mx-0.5">/</span>
        </>
      )}
      {invalidCount > 0 && (
        <>
          <span className="text-red-600">{invalidCount}</span>
          <span className="mx-0.5">/</span>
        </>
      )}
      <span>{totalCount}</span>
    </span>
  );
}

interface DiscrepancyBadgeProps {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const severityConfigs: Record<string, { bgColor: string; textColor: string }> = {
  low: { bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  medium: { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  high: { bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  critical: { bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

const discrepancyLabels: Record<string, string> = {
  CONTENT_MISMATCH: 'Content Mismatch',
  MISSING_DATA: 'Missing Data',
  CONFLICTING_SOURCES: 'Conflicting Sources',
  OUTDATED_REFERENCE: 'Outdated Reference',
  SCHEMA_VIOLATION: 'Schema Violation',
};

export function DiscrepancyBadge({
  type,
  severity,
  message,
  size = 'md',
  className = '',
}: DiscrepancyBadgeProps) {
  const config = severityConfigs[severity] || severityConfigs.medium;
  const label = discrepancyLabels[type] || type;

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bgColor} ${config.textColor}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label={`${severity} severity: ${label}${message ? ` - ${message}` : ''}`}
      title={message}
    >
      <span className="capitalize">{severity}</span>
      <span className="mx-1">|</span>
      <span>{label}</span>
    </span>
  );
}

export default ValidationBadge;
