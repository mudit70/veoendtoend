import { Router, Request, Response, NextFunction } from 'express';
import { discoveryService } from '../services/discoveryService.js';
import type { ApiResponse } from '@veoendtoend/shared';
import type { DiscoveryJob } from '../services/discoveryService.js';

const router = Router();

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// POST /api/projects/:projectId/discover - Start discovery for a project
router.post(
  '/projects/:projectId/discover',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const job = await discoveryService.startDiscovery(req.params.projectId);

      const response: ApiResponse<DiscoveryJob> = {
        success: true,
        data: job,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found') {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }
      throw error;
    }
  })
);

// GET /api/discovery/jobs/:jobId - Get job status
router.get(
  '/discovery/jobs/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const job = discoveryService.getJob(req.params.jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    const response: ApiResponse<DiscoveryJob> = {
      success: true,
      data: job,
    };

    res.json(response);
  })
);

// GET /api/projects/:projectId/discovery/latest - Get latest discovery job for project
router.get(
  '/projects/:projectId/discovery/latest',
  asyncHandler(async (req: Request, res: Response) => {
    const job = discoveryService.getLatestJobForProject(req.params.projectId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'No discovery jobs found for this project',
      });
      return;
    }

    const response: ApiResponse<DiscoveryJob> = {
      success: true,
      data: job,
    };

    res.json(response);
  })
);

export { router as discoveryRouter };
