import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import { llmClient } from './llmClient';
import {
  type ValidationRun,
  type ValidationResult,
  type Discrepancy,
  type ValidationStatus,
  type DiscrepancyType,
  calculateValidationScore,
  determineValidationStatus,
  getDiscrepancySeverity,
} from '../models/validation';

// Staleness threshold in milliseconds (7 days)
const STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export interface ValidationComponent {
  id: string;
  title: string;
  description: string | null;
  componentType: string;
  sourceDocumentId: string | null;
  sourceExcerpt: string | null;
  status: string;
  updatedAt: string;
}

export interface ValidationContext {
  component: ValidationComponent;
  documentContent: string | null;
  documentUpdatedAt: string | null;
}

/**
 * Validation Service - Core validation engine
 */
export class ValidationService {
  /**
   * Create a new validation run
   */
  async createValidationRun(diagramId: string): Promise<string> {
    const db = getDatabase();

    // Get component count
    const components = db.prepare(
      'SELECT COUNT(*) as count FROM diagram_components WHERE diagram_id = ?'
    ).get(diagramId) as { count: number };

    const validationId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO validation_runs (id, diagram_id, status, total_components, validated_components, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(validationId, diagramId, 'PENDING', components.count, 0, now);

    return validationId;
  }

  /**
   * Run validation for all components in a diagram
   */
  async validateDiagram(validationId: string, diagramId: string): Promise<ValidationResult[]> {
    const db = getDatabase();

    try {
      // Update status to running
      db.prepare('UPDATE validation_runs SET status = ? WHERE id = ?').run('RUNNING', validationId);

      // Get all components
      const components = db.prepare(`
        SELECT id, title, description, component_type as componentType,
               source_document_id as sourceDocumentId, source_excerpt as sourceExcerpt,
               status, updated_at as updatedAt
        FROM diagram_components WHERE diagram_id = ?
      `).all(diagramId) as ValidationComponent[];

      const results: ValidationResult[] = [];

      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        const result = await this.validateComponent(validationId, component);
        results.push(result);

        // Update progress
        db.prepare('UPDATE validation_runs SET validated_components = ? WHERE id = ?')
          .run(i + 1, validationId);
      }

      // Calculate final score
      const score = calculateValidationScore(results);

      // Update completion status
      db.prepare(`
        UPDATE validation_runs SET status = ?, score = ?, completed_at = ? WHERE id = ?
      `).run('COMPLETED', score, new Date().toISOString(), validationId);

      return results;
    } catch (error) {
      db.prepare('UPDATE validation_runs SET status = ? WHERE id = ?').run('FAILED', validationId);
      throw error;
    }
  }

  /**
   * Validate a single component
   */
  async validateComponent(validationId: string, component: ValidationComponent): Promise<ValidationResult> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Build validation context
    const context = await this.buildValidationContext(component);

    // Detect staleness
    const isStale = this.detectStaleness(context);

    // Determine validation status and discrepancies
    let status: ValidationStatus;
    let discrepancies: Discrepancy[] = [];
    let confidence = 0.85;

    if (!context.documentContent) {
      // No source document - unverifiable
      status = 'UNVERIFIABLE';
      confidence = 0.3;
    } else if (isStale) {
      // Document is stale
      status = 'STALE';
      discrepancies.push({
        type: 'OUTDATED_REFERENCE',
        severity: getDiscrepancySeverity('OUTDATED_REFERENCE'),
        message: 'Source document may be outdated',
        sourceDocumentId: component.sourceDocumentId || undefined,
      });
      confidence = 0.5;
    } else {
      // Perform LLM validation
      try {
        const validationResult = await this.performLLMValidation(context);
        discrepancies = validationResult.discrepancies;
        status = determineValidationStatus(discrepancies);
        confidence = validationResult.confidence;
      } catch (error) {
        // LLM validation failed - use basic validation
        status = 'WARNING';
        confidence = 0.5;
        discrepancies.push({
          type: 'MISSING_DATA',
          severity: 'medium',
          message: 'Unable to perform full validation',
        });
      }
    }

    // Store result
    const resultId = uuidv4();
    db.prepare(`
      INSERT INTO validation_results (id, validation_run_id, component_id, status, discrepancies, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(resultId, validationId, component.id, status, JSON.stringify(discrepancies), confidence, now);

    return {
      id: resultId,
      validationRunId: validationId,
      componentId: component.id,
      status,
      discrepancies,
      confidence,
      createdAt: now,
    };
  }

  /**
   * Build validation context for a component
   */
  async buildValidationContext(component: ValidationComponent): Promise<ValidationContext> {
    const db = getDatabase();

    let documentContent: string | null = null;
    let documentUpdatedAt: string | null = null;

    if (component.sourceDocumentId) {
      const document = db.prepare(`
        SELECT content, updated_at as updatedAt
        FROM documents WHERE id = ?
      `).get(component.sourceDocumentId) as { content: string; updatedAt: string } | undefined;

      if (document) {
        documentContent = document.content;
        documentUpdatedAt = document.updatedAt;
      }
    }

    return {
      component,
      documentContent,
      documentUpdatedAt,
    };
  }

  /**
   * Detect if the source document is stale
   */
  detectStaleness(context: ValidationContext): boolean {
    if (!context.documentUpdatedAt) {
      return false;
    }

    const documentDate = new Date(context.documentUpdatedAt);
    const componentDate = new Date(context.component.updatedAt);
    const now = new Date();

    // Check if document is older than threshold
    const documentAge = now.getTime() - documentDate.getTime();
    if (documentAge > STALENESS_THRESHOLD_MS) {
      return true;
    }

    // Check if component was updated after document
    if (componentDate > documentDate) {
      const diff = componentDate.getTime() - documentDate.getTime();
      // If component is significantly newer than document, it might be stale
      if (diff > 24 * 60 * 60 * 1000) { // 1 day
        return true;
      }
    }

    return false;
  }

  /**
   * Perform LLM-based validation
   */
  async performLLMValidation(context: ValidationContext): Promise<{
    discrepancies: Discrepancy[];
    confidence: number;
  }> {
    const prompt = this.buildValidationPrompt(context);

    try {
      const response = await llmClient.complete({
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
      });

      return this.parseValidationResponse(response, context);
    } catch (error) {
      // Return empty discrepancies on error
      return {
        discrepancies: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Build the validation prompt for LLM
   */
  buildValidationPrompt(context: ValidationContext): string {
    const { component, documentContent } = context;

    return `You are a validation assistant. Compare the following diagram component with its source documentation and identify any discrepancies.

COMPONENT:
- Title: ${component.title}
- Type: ${component.componentType}
- Description: ${component.description || 'No description provided'}
- Source Excerpt: ${component.sourceExcerpt || 'No excerpt available'}

SOURCE DOCUMENT:
${documentContent ? documentContent.substring(0, 3000) : 'No source document available'}

TASK:
1. Compare the component information with the source document
2. Identify any discrepancies or inconsistencies
3. Rate your confidence in the validation (0-1)

RESPONSE FORMAT (JSON):
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "discrepancies": [
    {
      "type": "CONTENT_MISMATCH" | "MISSING_DATA" | "CONFLICTING_SOURCES" | "SCHEMA_VIOLATION",
      "message": "Description of the discrepancy",
      "expectedValue": "What the document says",
      "actualValue": "What the component says"
    }
  ],
  "reasoning": "Brief explanation of your validation"
}`;
  }

  /**
   * Parse the LLM validation response
   */
  parseValidationResponse(
    response: string,
    context: ValidationContext
  ): { discrepancies: Discrepancy[]; confidence: number } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { discrepancies: [], confidence: 0.7 };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const discrepancies: Discrepancy[] = (parsed.discrepancies || []).map(
        (d: { type: DiscrepancyType; message: string; expectedValue?: string; actualValue?: string }) => ({
          type: d.type || 'CONTENT_MISMATCH',
          severity: getDiscrepancySeverity(d.type || 'CONTENT_MISMATCH'),
          message: d.message || 'Unknown discrepancy',
          expectedValue: d.expectedValue,
          actualValue: d.actualValue,
          sourceDocumentId: context.component.sourceDocumentId || undefined,
        })
      );

      return {
        discrepancies,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error) {
      // Return default values on parse error
      return { discrepancies: [], confidence: 0.7 };
    }
  }

  /**
   * Get validation results for a run
   */
  getValidationResults(validationRunId: string): ValidationResult[] {
    const db = getDatabase();

    const results = db.prepare(`
      SELECT id, validation_run_id as validationRunId, component_id as componentId,
             status, discrepancies, confidence, created_at as createdAt
      FROM validation_results WHERE validation_run_id = ?
    `).all(validationRunId) as Array<{
      id: string;
      validationRunId: string;
      componentId: string;
      status: ValidationStatus;
      discrepancies: string;
      confidence: number;
      createdAt: string;
    }>;

    return results.map(r => ({
      ...r,
      discrepancies: JSON.parse(r.discrepancies || '[]'),
    }));
  }
}

export const validationService = new ValidationService();
