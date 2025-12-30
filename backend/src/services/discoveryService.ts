import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';
import { llmClient } from './llmClient.js';
import type { Job } from '@veoendtoend/shared';

export interface DiscoveryJob extends Job {
  projectId: string;
}

/**
 * Discovery Service
 * Handles async discovery of operations from project documents
 */
export class DiscoveryService {
  /**
   * Start a new discovery job for a project
   */
  async startDiscovery(projectId: string): Promise<DiscoveryJob> {
    const db = getDatabase();

    // Check if project exists
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check for existing running job
    const existingJob = db.prepare(
      "SELECT * FROM discovery_jobs WHERE project_id = ? AND status IN ('PENDING', 'RUNNING')"
    ).get(projectId) as Record<string, unknown> | undefined;

    if (existingJob) {
      return this.mapRowToJob(existingJob);
    }

    // Create new job
    const jobId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO discovery_jobs (id, project_id, status, progress, created_at, updated_at)
      VALUES (?, ?, 'PENDING', 0, ?, ?)
    `).run(jobId, projectId, now, now);

    // Start async processing
    this.processDiscovery(jobId, projectId).catch(error => {
      console.error('Discovery processing error:', error);
    });

    const row = db.prepare('SELECT * FROM discovery_jobs WHERE id = ?').get(jobId) as Record<string, unknown>;
    return this.mapRowToJob(row);
  }

  /**
   * Get discovery job status
   */
  getJob(jobId: string): DiscoveryJob | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM discovery_jobs WHERE id = ?').get(jobId) as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.mapRowToJob(row);
  }

  /**
   * Get the latest discovery job for a project
   */
  getLatestJobForProject(projectId: string): DiscoveryJob | null {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT * FROM discovery_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(projectId) as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.mapRowToJob(row);
  }

  /**
   * Process discovery asynchronously
   */
  private async processDiscovery(jobId: string, projectId: string): Promise<void> {
    const db = getDatabase();

    try {
      // Update job status to RUNNING
      this.updateJobStatus(jobId, 'RUNNING', 10);

      // Get project documents
      const documents = db.prepare(
        'SELECT id, filename, extracted_text, content FROM documents WHERE project_id = ?'
      ).all(projectId) as Array<{ id: string; filename: string; extracted_text: string | null; content: string }>;

      if (documents.length === 0) {
        this.updateJobStatus(jobId, 'COMPLETED', 100, { message: 'No documents to process', operationsCreated: 0 });
        return;
      }

      this.updateJobStatus(jobId, 'RUNNING', 30);

      // Prepare documents for LLM
      const documentContents = documents.map(doc => ({
        filename: doc.filename,
        content: doc.extracted_text || doc.content,
      }));

      // Call LLM for discovery
      const result = await llmClient.discoverOperations(documentContents);

      this.updateJobStatus(jobId, 'RUNNING', 70);

      // Store discovered operations
      const now = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT INTO operations (id, project_id, name, description, type, status, confidence, source_document_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'DISCOVERED', ?, ?, ?, ?)
      `);

      let operationsCreated = 0;
      for (const op of result.operations) {
        const opId = uuidv4();
        // Find matching document IDs based on source references
        const matchingDocIds = this.findMatchingDocuments(documents, op.sourceReferences);

        insertStmt.run(
          opId,
          projectId,
          op.name,
          op.description,
          op.type,
          op.confidence,
          JSON.stringify(matchingDocIds),
          now,
          now
        );
        operationsCreated++;
      }

      // Update job as completed
      this.updateJobStatus(jobId, 'COMPLETED', 100, {
        operationsCreated,
        summary: result.summary,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateJobStatus(jobId, 'FAILED', 0, undefined, errorMessage);
    }
  }

  /**
   * Find document IDs that match source references
   */
  private findMatchingDocuments(
    documents: Array<{ id: string; filename: string; extracted_text: string | null; content: string }>,
    sourceReferences: string[]
  ): string[] {
    const matchingIds: string[] = [];

    for (const doc of documents) {
      const content = (doc.extracted_text || doc.content).toLowerCase();
      const filename = doc.filename.toLowerCase();

      for (const ref of sourceReferences) {
        const refLower = ref.toLowerCase();
        if (content.includes(refLower) || filename.includes(refLower)) {
          if (!matchingIds.includes(doc.id)) {
            matchingIds.push(doc.id);
          }
          break;
        }
      }
    }

    return matchingIds;
  }

  /**
   * Update job status in database
   */
  private updateJobStatus(
    jobId: string,
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
    progress: number,
    result?: unknown,
    error?: string
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE discovery_jobs
      SET status = ?, progress = ?, result = ?, error = ?, updated_at = ?
      WHERE id = ?
    `).run(
      status,
      progress,
      result ? JSON.stringify(result) : null,
      error || null,
      now,
      jobId
    );
  }

  /**
   * Map database row to DiscoveryJob
   */
  private mapRowToJob(row: Record<string, unknown>): DiscoveryJob {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      type: 'DISCOVERY',
      status: row.status as DiscoveryJob['status'],
      progress: row.progress as number,
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: row.error as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

// Export singleton instance
export const discoveryService = new DiscoveryService();
