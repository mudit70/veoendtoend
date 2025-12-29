import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDatabase } from '../database/connection.js';
import type { Document, ApiResponse } from '@veoendtoend/shared';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, markdown, PDF, and JSON files are allowed.'));
    }
  },
});

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// GET /api/documents/project/:projectId - List documents for a project
router.get(
  '/project/:projectId',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const documents = db
      .prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY created_at DESC')
      .all(req.params.projectId) as Document[];

    const response: ApiResponse<Document[]> = {
      success: true,
      data: documents.map((d) => ({
        id: d.id,
        projectId: d.projectId,
        filename: d.filename,
        mimeType: d.mimeType,
        content: d.content,
        hash: d.hash,
        size: d.size,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    };

    res.json(response);
  })
);

// GET /api/documents/:id - Get a single document
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as
      | Document
      | undefined;

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'Document not found',
      });
      return;
    }

    const response: ApiResponse<Document> = {
      success: true,
      data: {
        id: document.id,
        projectId: document.projectId,
        filename: document.filename,
        mimeType: document.mimeType,
        content: document.content,
        hash: document.hash,
        size: document.size,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    };

    res.json(response);
  })
);

// POST /api/documents/project/:projectId - Upload a document
router.post(
  '/project/:projectId',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
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
    const content = req.file.buffer.toString('utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    db.prepare(`
      INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.projectId, req.file.originalname, req.file.mimetype, content, hash, req.file.size, now, now);

    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document;

    const response: ApiResponse<Document> = {
      success: true,
      data: {
        id: document.id,
        projectId: document.projectId,
        filename: document.filename,
        mimeType: document.mimeType,
        content: document.content,
        hash: document.hash,
        size: document.size,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    };

    res.status(201).json(response);
  })
);

// DELETE /api/documents/:id - Delete a document
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Document not found',
      });
      return;
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  })
);

export { router as documentsRouter };
