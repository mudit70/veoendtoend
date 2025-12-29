import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';
import type { Project, ApiResponse } from '@veoendtoend/shared';

const router = Router();

// Validation middleware
const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
];

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper to map database row to Project object
function mapRowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// GET /api/projects - List all projects
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Record<string, unknown>[];

    const response: ApiResponse<Project[]> = {
      success: true,
      data: rows.map(mapRowToProject),
    };

    res.json(response);
  })
);

// GET /api/projects/:id - Get a single project
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;

    if (!row) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: mapRowToProject(row),
    };

    res.json(response);
  })
);

// POST /api/projects - Create a new project
router.post(
  '/',
  validateProject,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.body.name, req.body.description || null, now, now);

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>;

    const response: ApiResponse<Project> = {
      success: true,
      data: mapRowToProject(row),
    };

    res.status(201).json(response);
  })
);

// PUT /api/projects/:id - Update a project
router.put(
  '/:id',
  validateProject,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errors.array().map((e) => e.msg).join(', '),
      });
      return;
    }

    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE projects SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(req.body.name, req.body.description || null, now, req.params.id);

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Record<string, unknown>;

    const response: ApiResponse<Project> = {
      success: true,
      data: mapRowToProject(row),
    };

    res.json(response);
  })
);

// DELETE /api/projects/:id - Delete a project
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  })
);

export { router as projectsRouter };
