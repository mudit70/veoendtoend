import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { getDatabase } from '../database/connection.js';
import type { Document, ApiResponse, FolderImportRequest, RepoImportRequest, ImportResult } from '@veoendtoend/shared';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'text/x-markdown',
      'application/pdf',
      'application/json',
      'text/javascript',
      'application/javascript',
      'text/typescript',
      'text/x-typescript',
      'text/css',
      'text/html',
      'text/xml',
      'application/xml',
      'text/yaml',
      'application/x-yaml',
    ];
    // Also allow common code file extensions
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.rb', '.php', '.vue', '.svelte'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || codeExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only text, code, markdown, PDF, and JSON files are allowed.`));
    }
  },
});

// Default allowed file extensions for folder/repo imports
const DEFAULT_FILE_TYPES = ['.txt', '.md', '.json', '.pdf', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.rb', '.php', '.vue', '.svelte', '.css', '.html', '.xml', '.yaml', '.yml'];

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper to map database row to Document object
function mapRowToDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    filename: row.filename as string,
    filepath: row.filepath as string | undefined,
    mimeType: row.mime_type as string,
    content: row.content as string,
    hash: row.hash as string,
    size: row.size as number,
    sourceType: row.source_type as Document['sourceType'],
    sourcePath: row.source_path as string | undefined,
    sourceName: row.source_name as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Helper to detect MIME type from file extension
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.py': 'text/x-python',
    '.java': 'text/x-java',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.rb': 'text/x-ruby',
    '.php': 'text/x-php',
    '.vue': 'text/x-vue',
    '.svelte': 'text/x-svelte',
    '.css': 'text/css',
    '.html': 'text/html',
    '.xml': 'application/xml',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
  };
  return mimeTypes[ext] || 'text/plain';
}

// Helper to recursively get files from a directory
function getFilesFromDirectory(dirPath: string, fileTypes: string[], recursive: boolean = true): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip common non-code directories
      const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', '.venv', 'target', 'vendor'];
      if (skipDirs.includes(entry.name)) continue;

      if (recursive) {
        files.push(...getFilesFromDirectory(fullPath, fileTypes, recursive));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (fileTypes.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

// GET /api/documents/project/:projectId - List documents for a project
router.get(
  '/project/:projectId',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY created_at DESC')
      .all(req.params.projectId) as Record<string, unknown>[];

    const response: ApiResponse<Document[]> = {
      success: true,
      data: rows.map(mapRowToDocument),
    };

    res.json(response);
  })
);

// GET /api/documents/:id - Get a single document
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as
      | Record<string, unknown>
      | undefined;

    if (!row) {
      res.status(404).json({
        success: false,
        error: 'Document not found',
      });
      return;
    }

    const response: ApiResponse<Document> = {
      success: true,
      data: mapRowToDocument(row),
    };

    res.json(response);
  })
);

// POST /api/documents/project/:projectId - Upload a single document
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
      INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, source_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOAD', ?, ?)
    `).run(id, req.params.projectId, req.file.originalname, req.file.mimetype, content, hash, req.file.size, now, now);

    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown>;

    const response: ApiResponse<Document> = {
      success: true,
      data: mapRowToDocument(row),
    };

    res.status(201).json(response);
  })
);

// POST /api/documents/project/:projectId/batch - Upload multiple documents
router.post(
  '/project/:projectId/batch',
  upload.array('files', 50), // Max 50 files at once
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded',
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

    const documents: Document[] = [];
    const errors: { file: string; error: string }[] = [];
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO documents (id, project_id, filename, mime_type, content, hash, size, source_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOAD', ?, ?)
    `);

    for (const file of files) {
      try {
        const id = uuidv4();
        const content = file.buffer.toString('utf-8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');

        insertStmt.run(id, req.params.projectId, file.originalname, file.mimetype, content, hash, file.size, now, now);

        const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown>;
        documents.push(mapRowToDocument(row));
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const result: ImportResult = {
      totalFiles: files.length,
      importedFiles: documents.length,
      skippedFiles: errors.length,
      errors,
      documents,
    };

    const response: ApiResponse<ImportResult> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  })
);

// POST /api/documents/project/:projectId/from-folders - Import documents from local folders
router.post(
  '/project/:projectId/from-folders',
  asyncHandler(async (req: Request, res: Response) => {
    const importRequest = req.body as FolderImportRequest;

    if (!importRequest.folders || importRequest.folders.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No folders specified',
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

    const fileTypes = importRequest.fileTypes || DEFAULT_FILE_TYPES;
    const documents: Document[] = [];
    const errors: { file: string; error: string }[] = [];
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO documents (id, project_id, filename, filepath, mime_type, content, hash, size, source_type, source_path, source_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FOLDER', ?, ?, ?, ?)
    `);

    let totalFiles = 0;

    for (const folder of importRequest.folders) {
      const folderPath = folder.path;
      const sourceName = folder.name || path.basename(folderPath);
      const recursive = folder.recursive !== false; // Default to true

      if (!fs.existsSync(folderPath)) {
        errors.push({
          file: folderPath,
          error: 'Folder does not exist',
        });
        continue;
      }

      const files = getFilesFromDirectory(folderPath, fileTypes, recursive);
      totalFiles += files.length;

      for (const filePath of files) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          const stats = fs.statSync(filePath);
          const filename = path.basename(filePath);
          const relativePath = path.relative(folderPath, filePath);
          const mimeType = getMimeType(filename);

          const id = uuidv4();
          insertStmt.run(
            id,
            req.params.projectId,
            filename,
            relativePath,
            mimeType,
            content,
            hash,
            stats.size,
            folderPath,
            sourceName,
            now,
            now
          );

          const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown>;
          documents.push(mapRowToDocument(row));
        } catch (error) {
          errors.push({
            file: filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const result: ImportResult = {
      totalFiles,
      importedFiles: documents.length,
      skippedFiles: errors.length,
      errors,
      documents,
    };

    const response: ApiResponse<ImportResult> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  })
);

// POST /api/documents/project/:projectId/from-repos - Import documents from git repositories
router.post(
  '/project/:projectId/from-repos',
  asyncHandler(async (req: Request, res: Response) => {
    const importRequest = req.body as RepoImportRequest;

    if (!importRequest.repositories || importRequest.repositories.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No repositories specified',
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

    const fileTypes = importRequest.fileTypes || DEFAULT_FILE_TYPES;
    const documents: Document[] = [];
    const errors: { file: string; error: string }[] = [];
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO documents (id, project_id, filename, filepath, mime_type, content, hash, size, source_type, source_path, source_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REPOSITORY', ?, ?, ?, ?)
    `);

    let totalFiles = 0;

    for (const repo of importRequest.repositories) {
      const repoUrl = repo.url;
      const branch = repo.branch || 'main';
      const sourceName = repo.name || path.basename(repoUrl, '.git');

      // Create temp directory for cloning
      const tempDir = path.join(os.tmpdir(), `veo-repo-${uuidv4()}`);

      try {
        // Build git clone command with optional auth
        let cloneUrl = repoUrl;
        if (repo.authToken) {
          // Insert token into URL for auth (works for GitHub, GitLab, etc.)
          const urlObj = new URL(repoUrl);
          cloneUrl = `${urlObj.protocol}//oauth2:${repo.authToken}@${urlObj.host}${urlObj.pathname}`;
        }

        // Clone the repository (shallow clone for speed)
        execSync(`git clone --depth 1 --branch ${branch} "${cloneUrl}" "${tempDir}"`, {
          stdio: 'pipe',
          timeout: 60000, // 1 minute timeout
        });

        const files = getFilesFromDirectory(tempDir, fileTypes, true);
        totalFiles += files.length;

        for (const filePath of files) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            const stats = fs.statSync(filePath);
            const filename = path.basename(filePath);
            const relativePath = path.relative(tempDir, filePath);
            const mimeType = getMimeType(filename);

            const id = uuidv4();
            insertStmt.run(
              id,
              req.params.projectId,
              filename,
              relativePath,
              mimeType,
              content,
              hash,
              stats.size,
              repoUrl,
              sourceName,
              now,
              now
            );

            const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown>;
            documents.push(mapRowToDocument(row));
          } catch (error) {
            errors.push({
              file: filePath,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } catch (error) {
        errors.push({
          file: repoUrl,
          error: error instanceof Error ? error.message : 'Failed to clone repository',
        });
      } finally {
        // Clean up temp directory
        try {
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    const result: ImportResult = {
      totalFiles,
      importedFiles: documents.length,
      skippedFiles: errors.length,
      errors,
      documents,
    };

    const response: ApiResponse<ImportResult> = {
      success: true,
      data: result,
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

// DELETE /api/documents/project/:projectId/source/:sourceName - Delete all documents from a source
router.delete(
  '/project/:projectId/source/:sourceName',
  asyncHandler(async (req: Request, res: Response) => {
    const db = getDatabase();
    const { projectId, sourceName } = req.params;

    const result = db.prepare('DELETE FROM documents WHERE project_id = ? AND source_name = ?').run(projectId, sourceName);

    res.json({
      success: true,
      message: `Deleted ${result.changes} documents from source "${sourceName}"`,
    });
  })
);

export { router as documentsRouter };
