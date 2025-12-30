/**
 * Validation Module Exports
 *
 * This module provides comprehensive diagram validation functionality including:
 * - Validation service for running validation workflows
 * - Discrepancy detection for content, data, and source issues
 * - Scoring service for weighted validation scores and reports
 *
 * @example
 * ```typescript
 * import {
 *   validationService,
 *   discrepancyDetector,
 *   scoringService,
 * } from './services/validation';
 *
 * // Run validation
 * const validationId = await validationService.createValidationRun(diagramId);
 * const results = await validationService.validateDiagram(validationId, diagramId);
 *
 * // Generate report
 * const report = scoringService.generateScoringReport(results);
 * ```
 */

// Validation Service
export {
  ValidationService,
  validationService,
  type ValidationComponent,
  type ValidationContext,
} from '../validationService';

// Discrepancy Detection
export {
  DiscrepancyDetector,
  discrepancyDetector,
  type ComponentData,
  type DocumentData,
  type SuggestedFix,
} from '../discrepancyDetector';

// Scoring Service
export {
  ScoringService,
  scoringService,
  type ScoreBreakdown,
  type ComponentWeights,
  type TrendDataPoint,
  type HealthStatus,
  type ScoringReport,
} from '../scoringService';
