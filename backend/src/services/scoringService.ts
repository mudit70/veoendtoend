import { getDatabase } from '../database/connection';
import {
  type ValidationResult,
  type ValidationStatus,
  type Discrepancy,
  type ValidationSummary,
  calculateValidationScore,
  createValidationSummary,
} from '../models/validation';

/**
 * Score breakdown by category
 */
export interface ScoreBreakdown {
  contentAccuracy: number;
  dataCompleteness: number;
  sourceConsistency: number;
  freshness: number;
}

/**
 * Component type weights for scoring
 */
export interface ComponentWeights {
  [componentType: string]: number;
}

/**
 * Validation trend data point
 */
export interface TrendDataPoint {
  date: string;
  score: number;
  componentCount: number;
}

/**
 * Health status based on score
 */
export type HealthStatus = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';

/**
 * Detailed scoring report
 */
export interface ScoringReport {
  overallScore: number;
  healthStatus: HealthStatus;
  breakdown: ScoreBreakdown;
  summary: ValidationSummary;
  recommendations: string[];
  trends?: TrendDataPoint[];
}

/**
 * Default weights for component types
 */
const DEFAULT_COMPONENT_WEIGHTS: ComponentWeights = {
  USER_ACTION: 1.0,
  SYSTEM: 1.2,
  EXTERNAL_SYSTEM: 1.1,
  DATABASE: 1.3,
  QUEUE: 1.0,
  CACHE: 0.9,
  DEFAULT: 1.0,
};

/**
 * Score thresholds for health status
 */
const HEALTH_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 40,
};

/**
 * Scoring Service - Advanced validation scoring
 */
export class ScoringService {
  private componentWeights: ComponentWeights;

  constructor(weights?: ComponentWeights) {
    this.componentWeights = weights || DEFAULT_COMPONENT_WEIGHTS;
  }

  /**
   * Calculate weighted score for a diagram
   */
  calculateWeightedScore(
    results: ValidationResult[],
    componentTypes: Map<string, string>
  ): number {
    if (results.length === 0) return 0;

    const weights: Record<ValidationStatus, number> = {
      VALID: 1.0,
      WARNING: 0.7,
      INVALID: 0.0,
      UNVERIFIABLE: 0.3,
      STALE: 0.5,
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const result of results) {
      const componentType = componentTypes.get(result.componentId) || 'DEFAULT';
      const typeWeight = this.componentWeights[componentType] || this.componentWeights.DEFAULT || 1.0;

      const statusScore = weights[result.status] * result.confidence;
      totalWeightedScore += statusScore * typeWeight;
      totalWeight += result.confidence * typeWeight;
    }

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  }

  /**
   * Calculate score breakdown by category
   */
  calculateScoreBreakdown(results: ValidationResult[]): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      contentAccuracy: 100,
      dataCompleteness: 100,
      sourceConsistency: 100,
      freshness: 100,
    };

    if (results.length === 0) return breakdown;

    let contentIssues = 0;
    let dataIssues = 0;
    let consistencyIssues = 0;
    let freshnessIssues = 0;
    let totalDiscrepancies = 0;

    for (const result of results) {
      for (const discrepancy of result.discrepancies) {
        totalDiscrepancies++;

        switch (discrepancy.type) {
          case 'CONTENT_MISMATCH':
            contentIssues++;
            break;
          case 'MISSING_DATA':
            dataIssues++;
            break;
          case 'CONFLICTING_SOURCES':
            consistencyIssues++;
            break;
          case 'OUTDATED_REFERENCE':
          case 'SCHEMA_VIOLATION':
            freshnessIssues++;
            break;
        }
      }

      // Also check status
      if (result.status === 'STALE') {
        freshnessIssues++;
        totalDiscrepancies++;
      }
      if (result.status === 'UNVERIFIABLE') {
        dataIssues++;
        totalDiscrepancies++;
      }
    }

    // Calculate percentages (inverse of issues ratio)
    if (totalDiscrepancies > 0) {
      const issueWeight = totalDiscrepancies / results.length;

      breakdown.contentAccuracy = Math.max(0, 100 - (contentIssues / totalDiscrepancies) * issueWeight * 100);
      breakdown.dataCompleteness = Math.max(0, 100 - (dataIssues / totalDiscrepancies) * issueWeight * 100);
      breakdown.sourceConsistency = Math.max(0, 100 - (consistencyIssues / totalDiscrepancies) * issueWeight * 100);
      breakdown.freshness = Math.max(0, 100 - (freshnessIssues / totalDiscrepancies) * issueWeight * 100);
    }

    return breakdown;
  }

  /**
   * Determine health status from score
   */
  getHealthStatus(score: number): HealthStatus {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (score >= HEALTH_THRESHOLDS.GOOD) return 'GOOD';
    if (score >= HEALTH_THRESHOLDS.FAIR) return 'FAIR';
    if (score >= HEALTH_THRESHOLDS.POOR) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];

    const discrepancyCounts = this.countDiscrepanciesByType(results);
    const statusCounts = this.countByStatus(results);

    // Check for content mismatches
    if (discrepancyCounts.CONTENT_MISMATCH > 0) {
      recommendations.push(
        `Review ${discrepancyCounts.CONTENT_MISMATCH} component(s) with content mismatches against source documents.`
      );
    }

    // Check for missing data
    if (discrepancyCounts.MISSING_DATA > 0) {
      recommendations.push(
        `Add descriptions or source links to ${discrepancyCounts.MISSING_DATA} component(s) with missing data.`
      );
    }

    // Check for conflicting sources
    if (discrepancyCounts.CONFLICTING_SOURCES > 0) {
      recommendations.push(
        `Resolve conflicting information in ${discrepancyCounts.CONFLICTING_SOURCES} component(s) by updating source documents.`
      );
    }

    // Check for stale content
    if (statusCounts.STALE > 0) {
      recommendations.push(
        `Update ${statusCounts.STALE} component(s) that reference outdated source documents.`
      );
    }

    // Check for unverifiable components
    if (statusCounts.UNVERIFIABLE > 0) {
      recommendations.push(
        `Link ${statusCounts.UNVERIFIABLE} component(s) to source documents for verification.`
      );
    }

    // Check for invalid components
    if (statusCounts.INVALID > 0) {
      recommendations.push(
        `Prioritize fixing ${statusCounts.INVALID} invalid component(s) with critical issues.`
      );
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('All components are valid. Consider scheduling regular validation runs to maintain quality.');
    }

    return recommendations;
  }

  /**
   * Get validation trends for a diagram
   */
  getValidationTrends(diagramId: string, limit: number = 10): TrendDataPoint[] {
    const db = getDatabase();

    const runs = db.prepare(`
      SELECT score, completed_at as completedAt, validated_components as componentCount
      FROM validation_runs
      WHERE diagram_id = ? AND status = 'COMPLETED' AND score IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT ?
    `).all(diagramId, limit) as Array<{
      score: number;
      completedAt: string;
      componentCount: number;
    }>;

    return runs.map(run => ({
      date: run.completedAt,
      score: run.score,
      componentCount: run.componentCount,
    })).reverse(); // Oldest to newest for trend visualization
  }

  /**
   * Generate full scoring report
   */
  generateScoringReport(
    results: ValidationResult[],
    diagramId?: string,
    includeTrends: boolean = false
  ): ScoringReport {
    const overallScore = calculateValidationScore(results);
    const healthStatus = this.getHealthStatus(overallScore);
    const breakdown = this.calculateScoreBreakdown(results);
    const summary = createValidationSummary(results, new Date().toISOString());
    const recommendations = this.generateRecommendations(results);

    const report: ScoringReport = {
      overallScore,
      healthStatus,
      breakdown,
      summary,
      recommendations,
    };

    if (includeTrends && diagramId) {
      report.trends = this.getValidationTrends(diagramId);
    }

    return report;
  }

  /**
   * Calculate score delta between two validation runs
   */
  calculateScoreDelta(
    currentResults: ValidationResult[],
    previousResults: ValidationResult[]
  ): number {
    const currentScore = calculateValidationScore(currentResults);
    const previousScore = calculateValidationScore(previousResults);
    return currentScore - previousScore;
  }

  /**
   * Get component-level scores
   */
  getComponentScores(results: ValidationResult[]): Map<string, number> {
    const scores = new Map<string, number>();

    const weights: Record<ValidationStatus, number> = {
      VALID: 100,
      WARNING: 70,
      INVALID: 0,
      UNVERIFIABLE: 30,
      STALE: 50,
    };

    for (const result of results) {
      const baseScore = weights[result.status];
      const adjustedScore = baseScore * result.confidence;
      scores.set(result.componentId, adjustedScore);
    }

    return scores;
  }

  /**
   * Count discrepancies by type
   */
  private countDiscrepanciesByType(results: ValidationResult[]): Record<string, number> {
    const counts: Record<string, number> = {
      CONTENT_MISMATCH: 0,
      MISSING_DATA: 0,
      CONFLICTING_SOURCES: 0,
      OUTDATED_REFERENCE: 0,
      SCHEMA_VIOLATION: 0,
    };

    for (const result of results) {
      for (const discrepancy of result.discrepancies) {
        counts[discrepancy.type] = (counts[discrepancy.type] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Count results by status
   */
  private countByStatus(results: ValidationResult[]): Record<ValidationStatus, number> {
    const counts: Record<ValidationStatus, number> = {
      VALID: 0,
      WARNING: 0,
      INVALID: 0,
      UNVERIFIABLE: 0,
      STALE: 0,
    };

    for (const result of results) {
      counts[result.status]++;
    }

    return counts;
  }

  /**
   * Set custom component weights
   */
  setComponentWeights(weights: ComponentWeights): void {
    this.componentWeights = { ...DEFAULT_COMPONENT_WEIGHTS, ...weights };
  }

  /**
   * Get current component weights
   */
  getComponentWeights(): ComponentWeights {
    return { ...this.componentWeights };
  }
}

export const scoringService = new ScoringService();
