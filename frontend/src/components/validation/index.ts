/**
 * Validation UI Components
 *
 * This module provides React components for diagram validation features:
 * - ValidationTrigger: Button to start validation with progress tracking
 * - ValidationBadge: Status badges for validation states
 * - ValidationReportView: Full validation report with tabbed interface
 *
 * @example
 * ```tsx
 * import {
 *   ValidationTrigger,
 *   ValidationBadge,
 *   ValidationScoreBadge,
 *   ValidationReportView,
 * } from './components/validation';
 *
 * // Trigger validation
 * <ValidationTrigger
 *   diagramId={diagramId}
 *   onValidationComplete={handleComplete}
 * />
 *
 * // Display status
 * <ValidationBadge status="VALID" />
 * <ValidationScoreBadge score={85} />
 * ```
 */

// Validation Trigger
export { ValidationTrigger, default as ValidationTriggerDefault } from '../ValidationTrigger';

// Validation Badges
export {
  ValidationBadge,
  ValidationScoreBadge,
  ValidationSummaryBadge,
  DiscrepancyBadge,
  default as ValidationBadgeDefault,
} from '../ValidationBadge';

// Validation Report View
export {
  ValidationReportView,
  default as ValidationReportViewDefault,
} from '../ValidationReportView';
