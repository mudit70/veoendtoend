import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/connection.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

router.get('/db', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 as test').get() as { test: number };

    res.json({
      success: true,
      data: {
        status: 'connected',
        test: result.test === 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
    });
  }
});

export { router as healthRouter };
