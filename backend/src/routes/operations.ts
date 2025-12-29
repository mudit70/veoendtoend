import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';
import type { Operation, ApiResponse, OperationType, OperationStatus } from '@veoendtoend/shared';

const router = Router();

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation for creating/updating operations
const validateOperation = [
  body('name').trim().notEmpty().withMessage('Operation name is required'),
  body('description').optional().trim(),
  body('type').isIn(['USER_INTERACTION', 'CLIENT_OPERATION', 'API_CALL', 'DATA_FLOW'])
    .withMessage('Invalid operation type'),
];

const validateUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Operation name cannot be empty'),
  body('description').optional().trim(),
  body('type').optional().isIn(['USER_INTERACTION', 'CLIENT_OPERATION', 'API_CALL', 'DATA_FLOW'])
    .withMessage('Invalid operation type'),
  body('status').optional().isIn(['DISCOVERED', 'CONFIRMED', 'REJECTED', 'MANUAL'])
    .withMessage('Invalid operation status'),
];

// Helper to map database row to Operation
function mapRowToOperation(row: Record<string, unknown>): Operation {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    description: row.description as string || '',
    type: row.type as OperationType,
    status: row.status as OperationStatus,
    confidence: row.confidence as number,
    sourceDocumentIds: row.source_document_ids ? JSON.parse(row.source_document_ids as string) : [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// GET /api/projects/:projectId/operations - List operations for a project
router.get(
  '/projects/:projectId/operations',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const { status, type } = req.query;

    let query = 'SELECT * FROM operations WHERE project_id = ?';
    const params: unknown[] = [req.params.projectId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

    const response: ApiResponse<Operation[]> = {
      success: true,
      data: rows.map(mapRowToOperation),
    };

    res.json(response);
  })
);

// GET /api/operations/:id - Get a single operation
router.get(
  '/operations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({
        success: false,
        error: 'Operation not found',
      });
      return;
    }

    const response: ApiResponse<Operation> = {
      success: true,
      data: mapRowToOperation(row),
    };

    res.json(response);
  })
);

// POST /api/projects/:projectId/operations - Create a manual operation
router.post(
  '/projects/:projectId/operations',
  validateOperation,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array().map(e => e.msg).join(', '),
      });
      return;
    }

    const db = getDatabase();

    // Check if project exists
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO operations (id, project_id, name, description, type, status, confidence, source_document_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'MANUAL', 1.0, ?, ?, ?)
    `).run(
      id,
      req.params.projectId,
      req.body.name,
      req.body.description || '',
      req.body.type,
      JSON.stringify(req.body.sourceDocumentIds || []),
      now,
      now
    );

    const row = db.prepare('SELECT * FROM operations WHERE id = ?').get(id) as Record<string, unknown>;

    const response: ApiResponse<Operation> = {
      success: true,
      data: mapRowToOperation(row),
    };

    res.status(201).json(response);
  })
);

// PATCH /api/operations/:id - Update an operation
router.patch(
  '/operations/:id',
  validateUpdate,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array().map(e => e.msg).join(', '),
      });
      return;
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Operation not found',
      });
      return;
    }

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const params: unknown[] = [now];

    if (req.body.name !== undefined) {
      updates.push('name = ?');
      params.push(req.body.name);
    }

    if (req.body.description !== undefined) {
      updates.push('description = ?');
      params.push(req.body.description);
    }

    if (req.body.type !== undefined) {
      updates.push('type = ?');
      params.push(req.body.type);
    }

    if (req.body.status !== undefined) {
      updates.push('status = ?');
      params.push(req.body.status);
    }

    if (req.body.confidence !== undefined) {
      updates.push('confidence = ?');
      params.push(req.body.confidence);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE operations SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const row = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown>;

    const response: ApiResponse<Operation> = {
      success: true,
      data: mapRowToOperation(row),
    };

    res.json(response);
  })
);

// DELETE /api/operations/:id - Delete an operation
router.delete(
  '/operations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Operation not found',
      });
      return;
    }

    db.prepare('DELETE FROM operations WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Operation deleted successfully',
    });
  })
);

// POST /api/operations/:id/confirm - Shortcut to confirm an operation
router.post(
  '/operations/:id/confirm',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Operation not found',
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE operations SET status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(now, req.params.id);

    const row = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown>;

    const response: ApiResponse<Operation> = {
      success: true,
      data: mapRowToOperation(row),
    };

    res.json(response);
  })
);

// POST /api/operations/:id/reject - Shortcut to reject an operation
router.post(
  '/operations/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Operation not found',
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE operations SET status = 'REJECTED', updated_at = ? WHERE id = ?").run(now, req.params.id);

    const row = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as Record<string, unknown>;

    const response: ApiResponse<Operation> = {
      success: true,
      data: mapRowToOperation(row),
    };

    res.json(response);
  })
);

export { router as operationsRouter };
