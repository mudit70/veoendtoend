/**
 * Validation Data Model Types
 * Defines types for the validation engine
 */

// Validation status types
export type ValidationStatus = 'VALID' | 'WARNING' | 'INVALID' | 'UNVERIFIABLE' | 'STALE';

// Discrepancy types
export type DiscrepancyType = 'CONTENT_MISMATCH' | 'MISSING_DATA' | 'CONFLICTING_SOURCES' | 'OUTDATED_REFERENCE' | 'SCHEMA_VIOLATION';

// Validation run status
export type ValidationRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/**
 * A single discrepancy found during validation
 */
export interface Discrepancy {
  type: DiscrepancyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  expectedValue?: string;
  actualValue?: string;
  sourceDocumentId?: string;
  sourceExcerpt?: string;
  location?: {
    line?: number;
    column?: number;
    path?: string;
  };
}

/**
 * Validation result for a single component
 */
export interface ValidationResult {
  id: string;
  validationRunId: string;
  componentId: string;
  status: ValidationStatus;
  discrepancies: Discrepancy[];
  confidence: number;
  createdAt: string;
}

/**
 * A validation run against a diagram
 */
export interface ValidationRun {
  id: string;
  diagramId: string;
  status: ValidationRunStatus;
  score: number | null;
  totalComponents: number;
  validatedComponents: number;
  startedAt: string;
  completedAt: string | null;
  results?: ValidationResult[];
}

/**
 * Document version for tracking changes
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  hash: string;
  createdAt: string;
}

/**
 * Input for creating a new validation run
 */
export interface CreateValidationRunInput {
  diagramId: string;
}

/**
 * Input for recording a validation result
 */
export interface CreateValidationResultInput {
  validationRunId: string;
  componentId: string;
  status: ValidationStatus;
  discrepancies: Discrepancy[];
  confidence: number;
}

/**
 * Validation summary statistics
 */
export interface ValidationSummary {
  totalComponents: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  unverifiableCount: number;
  staleCount: number;
  overallScore: number;
  lastValidatedAt: string | null;
}

/**
 * Calculate validation score from results
 */
export function calculateValidationScore(results: ValidationResult[]): number {
  if (results.length === 0) return 0;

  const weights: Record<ValidationStatus, number> = {
    VALID: 1.0,
    WARNING: 0.7,
    INVALID: 0.0,
    UNVERIFIABLE: 0.3,
    STALE: 0.5,
  };

  const totalScore = results.reduce((sum, result) => {
    return sum + weights[result.status] * result.confidence;
  }, 0);

  const maxScore = results.reduce((sum, result) => {
    return sum + result.confidence;
  }, 0);

  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
}

/**
 * Get severity level for discrepancy type
 */
export function getDiscrepancySeverity(type: DiscrepancyType): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<DiscrepancyType, 'low' | 'medium' | 'high' | 'critical'> = {
    CONTENT_MISMATCH: 'high',
    MISSING_DATA: 'medium',
    CONFLICTING_SOURCES: 'critical',
    OUTDATED_REFERENCE: 'low',
    SCHEMA_VIOLATION: 'high',
  };
  return severityMap[type];
}

/**
 * Determine overall status from discrepancies
 */
export function determineValidationStatus(discrepancies: Discrepancy[]): ValidationStatus {
  if (discrepancies.length === 0) return 'VALID';

  const hasCritical = discrepancies.some(d => d.severity === 'critical');
  const hasHigh = discrepancies.some(d => d.severity === 'high');
  const hasMedium = discrepancies.some(d => d.severity === 'medium');

  if (hasCritical) return 'INVALID';
  if (hasHigh) return 'WARNING';
  if (hasMedium) return 'WARNING';

  return 'VALID';
}

/**
 * Create a validation summary from results
 */
export function createValidationSummary(
  results: ValidationResult[],
  lastValidatedAt: string | null = null
): ValidationSummary {
  const summary: ValidationSummary = {
    totalComponents: results.length,
    validCount: 0,
    warningCount: 0,
    invalidCount: 0,
    unverifiableCount: 0,
    staleCount: 0,
    overallScore: 0,
    lastValidatedAt,
  };

  for (const result of results) {
    switch (result.status) {
      case 'VALID':
        summary.validCount++;
        break;
      case 'WARNING':
        summary.warningCount++;
        break;
      case 'INVALID':
        summary.invalidCount++;
        break;
      case 'UNVERIFIABLE':
        summary.unverifiableCount++;
        break;
      case 'STALE':
        summary.staleCount++;
        break;
    }
  }

  summary.overallScore = calculateValidationScore(results);

  return summary;
}
