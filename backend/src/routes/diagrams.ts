import { Router, Request, Response } from 'express';
import { diagramService } from '../services/diagramService';

const router = Router();

// POST /api/projects/:projectId/operations/:operationId/diagrams - Generate diagram for an operation
router.post('/projects/:projectId/operations/:operationId/diagrams', async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;

    const job = await diagramService.startDiagramGeneration(operationId);
    res.status(202).json({ success: true, data: job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start diagram generation';
    if (message === 'Operation not found') {
      res.status(404).json({ success: false, error: message });
    } else {
      res.status(500).json({ success: false, error: message });
    }
  }
});

// GET /api/diagram-jobs/:jobId - Get diagram generation job status
router.get('/diagram-jobs/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = diagramService.getJob(jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  res.json({ success: true, data: job });
});

// GET /api/diagrams/:id - Get diagram with components and edges
router.get('/diagrams/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const diagram = diagramService.getDiagram(id);
  if (!diagram) {
    return res.status(404).json({ success: false, error: 'Diagram not found' });
  }

  res.json({ success: true, data: diagram });
});

// GET /api/projects/:projectId/operations/:operationId/diagrams - List diagrams for an operation
router.get('/projects/:projectId/operations/:operationId/diagrams', (req: Request, res: Response) => {
  const { operationId } = req.params;

  const diagrams = diagramService.getDiagramsForOperation(operationId);
  res.json({ success: true, data: diagrams });
});

// GET /api/projects/:projectId/operations/:operationId/diagrams/latest - Get latest diagram for an operation
router.get('/projects/:projectId/operations/:operationId/diagrams/latest', (req: Request, res: Response) => {
  const { operationId } = req.params;

  const diagram = diagramService.getLatestDiagramForOperation(operationId);
  if (!diagram) {
    return res.status(404).json({ success: false, error: 'No diagrams found for this operation' });
  }

  res.json({ success: true, data: diagram });
});

// PUT /api/diagrams/:id - Update diagram (name, viewport state)
router.put('/diagrams/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, viewportState } = req.body;

  const diagram = diagramService.updateDiagram(id, { name, viewportState });
  if (!diagram) {
    return res.status(404).json({ success: false, error: 'Diagram not found' });
  }

  res.json({ success: true, data: diagram });
});

// PATCH /api/diagrams/:id/components/:componentId - Update a component
router.patch('/diagrams/:id/components/:componentId', (req: Request, res: Response) => {
  const { id, componentId } = req.params;
  const { title, description } = req.body;

  const component = diagramService.updateComponent(id, componentId, { title, description });
  if (!component) {
    return res.status(404).json({ success: false, error: 'Diagram or component not found' });
  }

  res.json({ success: true, data: component });
});

// POST /api/diagrams/:id/components/:componentId/reset - Reset component to original
router.post('/diagrams/:id/components/:componentId/reset', (req: Request, res: Response) => {
  const { id, componentId } = req.params;

  const component = diagramService.resetComponent(id, componentId);
  if (!component) {
    return res.status(404).json({ success: false, error: 'Diagram or component not found' });
  }

  res.json({ success: true, data: component });
});

// POST /api/diagrams/:id/export - Export diagram
router.post('/diagrams/:id/export', (req: Request, res: Response) => {
  const { id } = req.params;
  const { format = 'json' } = req.body;

  if (format !== 'json') {
    return res.status(400).json({ success: false, error: 'Only JSON export is currently supported' });
  }

  const exportData = diagramService.exportDiagram(id, format);
  if (!exportData) {
    return res.status(404).json({ success: false, error: 'Diagram not found' });
  }

  res.json({ success: true, data: exportData });
});

export { router as diagramsRouter };
