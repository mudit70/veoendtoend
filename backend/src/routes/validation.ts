import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import type {
  ValidationRun,
  ValidationResult,
  Discrepancy,
  ValidationStatus,
  ValidationRunStatus,
} from '../models/validation';
import { calculateValidationScore, createValidationSummary } from '../models/validation';

const router = Router();

/**
 * POST /api/diagrams/:id/validate
 * Trigger validation for a diagram
 */
router.post('/diagrams/:id/validate', async (req: Request, res: Response) => {
  const { id: diagramId } = req.params;

  try {
    const db = getDatabase();

    // Check if diagram exists
    const diagram = db.prepare('SELECT * FROM diagrams WHERE id = ?').get(diagramId);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    // Check if there's already a running validation
    const runningValidation = db.prepare(
      'SELECT * FROM validation_runs WHERE diagram_id = ? AND status IN (?, ?)'
    ).get(diagramId, 'PENDING', 'RUNNING');

    if (runningValidation) {
      return res.status(409).json({
        error: 'Validation already in progress',
        validationId: (runningValidation as { id: string }).id,
      });
    }

    // Get components to validate
    const components = db.prepare(
      'SELECT id FROM diagram_components WHERE diagram_id = ?'
    ).all(diagramId);

    // Create new validation run
    const validationId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO validation_runs (id, diagram_id, status, total_components, validated_components, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(validationId, diagramId, 'PENDING', components.length, 0, now);

    // Start validation asynchronously (in real implementation)
    // For now, we'll just mark it as pending
    setTimeout(() => {
      startValidation(validationId, diagramId);
    }, 100);

    return res.status(202).json({
      id: validationId,
      diagramId,
      status: 'PENDING',
      totalComponents: components.length,
      validatedComponents: 0,
      startedAt: now,
    });
  } catch (error) {
    console.error('Failed to trigger validation:', error);
    return res.status(500).json({ error: 'Failed to trigger validation' });
  }
});

/**
 * GET /api/validations/:id/status
 * Get validation run status
 */
router.get('/validations/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getDatabase();

    const validation = db.prepare(`
      SELECT id, diagram_id, status, score, total_components, validated_components, started_at, completed_at
      FROM validation_runs WHERE id = ?
    `).get(id) as {
      id: string;
      diagram_id: string;
      status: ValidationRunStatus;
      score: number | null;
      total_components: number;
      validated_components: number;
      started_at: string;
      completed_at: string | null;
    } | undefined;

    if (!validation) {
      return res.status(404).json({ error: 'Validation run not found' });
    }

    const progress = validation.total_components > 0
      ? (validation.validated_components / validation.total_components) * 100
      : 0;

    return res.json({
      id: validation.id,
      diagramId: validation.diagram_id,
      status: validation.status,
      score: validation.score,
      progress,
      totalComponents: validation.total_components,
      validatedComponents: validation.validated_components,
      startedAt: validation.started_at,
      completedAt: validation.completed_at,
    });
  } catch (error) {
    console.error('Failed to get validation status:', error);
    return res.status(500).json({ error: 'Failed to get validation status' });
  }
});

/**
 * GET /api/validations/:id
 * Get full validation report
 */
router.get('/validations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getDatabase();

    const validation = db.prepare(`
      SELECT id, diagram_id, status, score, total_components, validated_components, started_at, completed_at
      FROM validation_runs WHERE id = ?
    `).get(id) as {
      id: string;
      diagram_id: string;
      status: ValidationRunStatus;
      score: number | null;
      total_components: number;
      validated_components: number;
      started_at: string;
      completed_at: string | null;
    } | undefined;

    if (!validation) {
      return res.status(404).json({ error: 'Validation run not found' });
    }

    // Get validation results
    const results = db.prepare(`
      SELECT vr.id, vr.validation_run_id, vr.component_id, vr.status, vr.discrepancies, vr.confidence, vr.created_at,
             dc.title as component_title, dc.component_type
      FROM validation_results vr
      JOIN diagram_components dc ON vr.component_id = dc.id
      WHERE vr.validation_run_id = ?
    `).all(id) as Array<{
      id: string;
      validation_run_id: string;
      component_id: string;
      status: ValidationStatus;
      discrepancies: string | null;
      confidence: number;
      created_at: string;
      component_title: string;
      component_type: string;
    }>;

    const parsedResults: (ValidationResult & { componentTitle: string; componentType: string })[] = results.map(r => ({
      id: r.id,
      validationRunId: r.validation_run_id,
      componentId: r.component_id,
      status: r.status,
      discrepancies: r.discrepancies ? JSON.parse(r.discrepancies) : [],
      confidence: r.confidence,
      createdAt: r.created_at,
      componentTitle: r.component_title,
      componentType: r.component_type,
    }));

    const summary = createValidationSummary(
      parsedResults,
      validation.completed_at
    );

    return res.json({
      id: validation.id,
      diagramId: validation.diagram_id,
      status: validation.status,
      score: validation.score,
      totalComponents: validation.total_components,
      validatedComponents: validation.validated_components,
      startedAt: validation.started_at,
      completedAt: validation.completed_at,
      results: parsedResults,
      summary,
    });
  } catch (error) {
    console.error('Failed to get validation report:', error);
    return res.status(500).json({ error: 'Failed to get validation report' });
  }
});

/**
 * GET /api/diagrams/:id/validations
 * Get validation history for a diagram
 */
router.get('/diagrams/:id/validations', async (req: Request, res: Response) => {
  const { id: diagramId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const db = getDatabase();

    // Check if diagram exists
    const diagram = db.prepare('SELECT id FROM diagrams WHERE id = ?').get(diagramId);
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    const validations = db.prepare(`
      SELECT id, diagram_id, status, score, total_components, validated_components, started_at, completed_at
      FROM validation_runs
      WHERE diagram_id = ?
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `).all(diagramId, limit, offset) as Array<{
      id: string;
      diagram_id: string;
      status: ValidationRunStatus;
      score: number | null;
      total_components: number;
      validated_components: number;
      started_at: string;
      completed_at: string | null;
    }>;

    const totalCount = db.prepare(
      'SELECT COUNT(*) as count FROM validation_runs WHERE diagram_id = ?'
    ).get(diagramId) as { count: number };

    return res.json({
      validations: validations.map(v => ({
        id: v.id,
        diagramId: v.diagram_id,
        status: v.status,
        score: v.score,
        totalComponents: v.total_components,
        validatedComponents: v.validated_components,
        startedAt: v.started_at,
        completedAt: v.completed_at,
      })),
      pagination: {
        total: totalCount.count,
        limit,
        offset,
        hasMore: offset + validations.length < totalCount.count,
      },
    });
  } catch (error) {
    console.error('Failed to get validation history:', error);
    return res.status(500).json({ error: 'Failed to get validation history' });
  }
});

/**
 * Async validation process (simplified)
 */
async function startValidation(validationId: string, diagramId: string): Promise<void> {
  const db = getDatabase();

  try {
    // Mark as running
    db.prepare('UPDATE validation_runs SET status = ? WHERE id = ?').run('RUNNING', validationId);

    // Get components
    const components = db.prepare(`
      SELECT id, title, description, component_type, source_document_id, source_excerpt
      FROM diagram_components WHERE diagram_id = ?
    `).all(diagramId) as Array<{
      id: string;
      title: string;
      description: string | null;
      component_type: string;
      source_document_id: string | null;
      source_excerpt: string | null;
    }>;

    const results: ValidationResult[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      // Simulate validation (in real implementation, this would check against documents)
      const discrepancies: Discrepancy[] = [];
      let status: ValidationStatus = 'VALID';
      let confidence = 0.85;

      // If no source document, mark as unverifiable
      if (!component.source_document_id) {
        status = 'UNVERIFIABLE';
        confidence = 0.3;
      }

      const resultId = uuidv4();
      db.prepare(`
        INSERT INTO validation_results (id, validation_run_id, component_id, status, discrepancies, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(resultId, validationId, component.id, status, JSON.stringify(discrepancies), confidence, now);

      results.push({
        id: resultId,
        validationRunId: validationId,
        componentId: component.id,
        status,
        discrepancies,
        confidence,
        createdAt: now,
      });

      // Update progress
      db.prepare('UPDATE validation_runs SET validated_components = ? WHERE id = ?')
        .run(i + 1, validationId);
    }

    // Calculate final score
    const score = calculateValidationScore(results);

    // Mark as completed
    db.prepare(`
      UPDATE validation_runs SET status = ?, score = ?, completed_at = ? WHERE id = ?
    `).run('COMPLETED', score, new Date().toISOString(), validationId);
  } catch (error) {
    console.error('Validation failed:', error);
    db.prepare('UPDATE validation_runs SET status = ? WHERE id = ?').run('FAILED', validationId);
  }
}

export default router;
