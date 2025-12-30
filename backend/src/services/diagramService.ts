import type { Diagram, DiagramComponent, DiagramEdge, ComponentType, Job } from '@veoendtoend/shared';
import { getDatabase } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { extractionEngine } from './extractionEngine';

interface OperationRow {
  id: string;
  name: string;
  description: string;
  project_id: string;
}

interface DocumentRow {
  id: string;
  filename: string;
  content: string;
  extracted_text: string | null;
}

export interface DiagramJob extends Job {
  diagramId: string;
  operationId: string;
}

export interface DiagramWithDetails extends Diagram {
  components: DiagramComponent[];
  edges: DiagramEdge[];
}

// Define the 11 fixed template components with their positions
const TEMPLATE_COMPONENTS: { type: ComponentType; title: string; position: { x: number; y: number } }[] = [
  { type: 'USER_ACTION', title: 'User Action', position: { x: 100, y: 300 } },
  { type: 'CLIENT_CODE', title: 'Client Code', position: { x: 250, y: 300 } },
  { type: 'FIREWALL', title: 'Firewall', position: { x: 400, y: 300 } },
  { type: 'WAF', title: 'WAF', position: { x: 550, y: 300 } },
  { type: 'LOAD_BALANCER', title: 'Load Balancer', position: { x: 700, y: 300 } },
  { type: 'API_GATEWAY', title: 'API Gateway', position: { x: 850, y: 300 } },
  { type: 'API_ENDPOINT', title: 'API Endpoint', position: { x: 1000, y: 300 } },
  { type: 'BACKEND_LOGIC', title: 'Backend Logic', position: { x: 1150, y: 300 } },
  { type: 'DATABASE', title: 'Database', position: { x: 1300, y: 300 } },
  { type: 'EVENT_HANDLER', title: 'Event Handler', position: { x: 1150, y: 450 } },
  { type: 'VIEW_UPDATE', title: 'View Update', position: { x: 250, y: 450 } },
];

// Define edge connections for request/response flow
const TEMPLATE_EDGES: { sourceType: ComponentType; targetType: ComponentType; edgeType: 'REQUEST' | 'RESPONSE'; label?: string }[] = [
  // Request flow
  { sourceType: 'USER_ACTION', targetType: 'CLIENT_CODE', edgeType: 'REQUEST', label: 'triggers' },
  { sourceType: 'CLIENT_CODE', targetType: 'FIREWALL', edgeType: 'REQUEST', label: 'sends request' },
  { sourceType: 'FIREWALL', targetType: 'WAF', edgeType: 'REQUEST', label: 'forwards' },
  { sourceType: 'WAF', targetType: 'LOAD_BALANCER', edgeType: 'REQUEST', label: 'passes' },
  { sourceType: 'LOAD_BALANCER', targetType: 'API_GATEWAY', edgeType: 'REQUEST', label: 'routes' },
  { sourceType: 'API_GATEWAY', targetType: 'API_ENDPOINT', edgeType: 'REQUEST', label: 'forwards' },
  { sourceType: 'API_ENDPOINT', targetType: 'BACKEND_LOGIC', edgeType: 'REQUEST', label: 'calls' },
  { sourceType: 'BACKEND_LOGIC', targetType: 'DATABASE', edgeType: 'REQUEST', label: 'queries' },
  { sourceType: 'BACKEND_LOGIC', targetType: 'EVENT_HANDLER', edgeType: 'REQUEST', label: 'emits event' },
  // Response flow
  { sourceType: 'DATABASE', targetType: 'BACKEND_LOGIC', edgeType: 'RESPONSE', label: 'returns data' },
  { sourceType: 'BACKEND_LOGIC', targetType: 'API_ENDPOINT', edgeType: 'RESPONSE', label: 'responds' },
  { sourceType: 'API_ENDPOINT', targetType: 'API_GATEWAY', edgeType: 'RESPONSE', label: 'returns' },
  { sourceType: 'API_GATEWAY', targetType: 'CLIENT_CODE', edgeType: 'RESPONSE', label: 'delivers' },
  { sourceType: 'EVENT_HANDLER', targetType: 'VIEW_UPDATE', edgeType: 'RESPONSE', label: 'triggers update' },
  { sourceType: 'VIEW_UPDATE', targetType: 'CLIENT_CODE', edgeType: 'RESPONSE', label: 'updates UI' },
];

export class DiagramService {
  private jobs = new Map<string, DiagramJob>();
  private diagrams = new Map<string, DiagramWithDetails>();

  async startDiagramGeneration(operationId: string): Promise<DiagramJob> {
    // Verify operation exists
    const db = getDatabase();
    const operation = db.prepare('SELECT id, name, description, project_id FROM operations WHERE id = ?').get(operationId) as OperationRow | undefined;
    if (!operation) {
      throw new Error('Operation not found');
    }

    const diagramId = uuidv4();
    const jobId = uuidv4();
    const now = new Date().toISOString();

    // Create the diagram in pending state
    const diagram: Diagram = {
      id: diagramId,
      operationId,
      name: `Diagram for ${operation.name}`,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    // Create job
    const job: DiagramJob = {
      id: jobId,
      diagramId,
      operationId,
      type: 'DIAGRAM_GENERATION',
      status: 'PENDING',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);

    // Store initial diagram state
    this.diagrams.set(diagramId, {
      ...diagram,
      components: [],
      edges: [],
    });

    // Start async generation
    this.generateDiagram(jobId, diagramId, operationId);

    return job;
  }

  private async generateDiagram(jobId: string, diagramId: string, operationId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    const diagram = this.diagrams.get(diagramId);
    if (!job || !diagram) return;

    try {
      // Update to running
      job.status = 'RUNNING';
      job.updatedAt = new Date().toISOString();
      diagram.status = 'GENERATING';
      diagram.updatedAt = new Date().toISOString();

      // Get operation for context
      const db = getDatabase();
      const operation = db.prepare('SELECT id, name, description, project_id FROM operations WHERE id = ?').get(operationId) as OperationRow | undefined;
      if (!operation) {
        throw new Error('Operation not found');
      }

      // Get documents for the operation's project
      const documents = db.prepare('SELECT id, filename, content, extracted_text FROM documents WHERE project_id = ?').all(operation.project_id) as DocumentRow[];

      // Convert documents to extraction engine format
      const docContents = documents.map((d: DocumentRow) => ({
        id: d.id,
        filename: d.filename,
        content: d.extracted_text || d.content,
      }));

      // Use extraction engine to get component details
      const extractionResults = await extractionEngine.extractAllComponents(
        operation.name,
        operation.description,
        docContents
      );

      // Create components using extraction results
      const components: DiagramComponent[] = [];
      const componentMap = new Map<ComponentType, string>();
      const now = new Date().toISOString();

      let progress = 10;
      for (const template of TEMPLATE_COMPONENTS) {
        const componentId = uuidv4();
        componentMap.set(template.type, componentId);

        // Get extraction result for this component type
        const extraction = extractionResults.get(template.type);
        const hasData = extraction?.hasData ?? false;

        const component: DiagramComponent = {
          id: componentId,
          diagramId,
          componentType: template.type,
          title: extraction?.title || template.title,
          description: extraction?.description || 'No relevant data found in documents',
          status: hasData ? 'POPULATED' : 'GREYED_OUT',
          confidence: extraction?.confidence ?? 0,
          position: template.position,
          isUserModified: false,
          createdAt: now,
          updatedAt: now,
        };

        if (hasData && extraction?.sourceDocumentId) {
          component.sourceDocumentId = extraction.sourceDocumentId;
          component.sourceExcerpt = extraction.sourceExcerpt;
        }

        components.push(component);

        // Update progress
        progress += 7;
        job.progress = Math.min(progress, 90);
        job.updatedAt = new Date().toISOString();

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Create edges
      const edges: DiagramEdge[] = [];
      for (const edgeTemplate of TEMPLATE_EDGES) {
        const sourceId = componentMap.get(edgeTemplate.sourceType);
        const targetId = componentMap.get(edgeTemplate.targetType);

        if (sourceId && targetId) {
          edges.push({
            id: uuidv4(),
            diagramId,
            sourceComponentId: sourceId,
            targetComponentId: targetId,
            edgeType: edgeTemplate.edgeType,
            label: edgeTemplate.label,
            createdAt: now,
          });
        }
      }

      // Update diagram with components and edges
      diagram.components = components;
      diagram.edges = edges;
      diagram.status = 'COMPLETED';
      diagram.updatedAt = new Date().toISOString();

      // Complete job
      job.status = 'COMPLETED';
      job.progress = 100;
      job.result = { diagramId, componentCount: components.length, edgeCount: edges.length };
      job.updatedAt = new Date().toISOString();

    } catch (error) {
      job.status = 'FAILED';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date().toISOString();

      diagram.status = 'FAILED';
      diagram.updatedAt = new Date().toISOString();
    }
  }

  getJob(jobId: string): DiagramJob | null {
    return this.jobs.get(jobId) || null;
  }

  getDiagram(diagramId: string): DiagramWithDetails | null {
    return this.diagrams.get(diagramId) || null;
  }

  getDiagramsForOperation(operationId: string): Diagram[] {
    const diagrams: Diagram[] = [];
    for (const diagram of this.diagrams.values()) {
      if (diagram.operationId === operationId) {
        // Return diagram without components/edges for list view
        const { id, operationId: opId, name, status, viewportState, createdAt, updatedAt } = diagram;
        diagrams.push({ id, operationId: opId, name, status, viewportState, createdAt, updatedAt });
      }
    }
    return diagrams;
  }

  getLatestDiagramForOperation(operationId: string): DiagramWithDetails | null {
    let latest: DiagramWithDetails | null = null;
    for (const diagram of this.diagrams.values()) {
      if (diagram.operationId === operationId) {
        if (!latest || diagram.createdAt > latest.createdAt) {
          latest = diagram;
        }
      }
    }
    return latest;
  }

  updateComponent(
    diagramId: string,
    componentId: string,
    updates: { title?: string; description?: string }
  ): DiagramComponent | null {
    const diagram = this.diagrams.get(diagramId);
    if (!diagram) return null;

    const componentIndex = diagram.components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) return null;

    const component = diagram.components[componentIndex];
    const now = new Date().toISOString();

    // Store original values if not already stored
    if (!component.isUserModified) {
      component.originalTitle = component.title;
      component.originalDescription = component.description;
    }

    // Apply updates
    if (updates.title !== undefined) {
      component.title = updates.title;
    }
    if (updates.description !== undefined) {
      component.description = updates.description;
    }

    component.status = 'USER_MODIFIED';
    component.isUserModified = true;
    component.updatedAt = now;
    diagram.updatedAt = now;

    return component;
  }

  resetComponent(diagramId: string, componentId: string): DiagramComponent | null {
    const diagram = this.diagrams.get(diagramId);
    if (!diagram) return null;

    const componentIndex = diagram.components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) return null;

    const component = diagram.components[componentIndex];
    const now = new Date().toISOString();

    // Restore original values
    if (component.originalTitle) {
      component.title = component.originalTitle;
    }
    if (component.originalDescription) {
      component.description = component.originalDescription;
    }

    component.originalTitle = undefined;
    component.originalDescription = undefined;
    component.status = component.confidence > 0 ? 'POPULATED' : 'GREYED_OUT';
    component.isUserModified = false;
    component.updatedAt = now;
    diagram.updatedAt = now;

    return component;
  }

  updateDiagram(
    diagramId: string,
    updates: { name?: string; viewportState?: { x: number; y: number; zoom: number } }
  ): Diagram | null {
    const diagram = this.diagrams.get(diagramId);
    if (!diagram) return null;

    if (updates.name !== undefined) {
      diagram.name = updates.name;
    }
    if (updates.viewportState !== undefined) {
      diagram.viewportState = updates.viewportState;
    }
    diagram.updatedAt = new Date().toISOString();

    const { id, operationId, name, status, viewportState, createdAt, updatedAt } = diagram;
    return { id, operationId, name, status, viewportState, createdAt, updatedAt };
  }

  exportDiagram(diagramId: string, format: 'json'): unknown {
    const diagram = this.diagrams.get(diagramId);
    if (!diagram) return null;

    if (format === 'json') {
      return {
        diagram: {
          id: diagram.id,
          name: diagram.name,
          operationId: diagram.operationId,
          status: diagram.status,
          viewportState: diagram.viewportState,
          createdAt: diagram.createdAt,
          updatedAt: diagram.updatedAt,
        },
        components: diagram.components.map(c => ({
          id: c.id,
          type: c.componentType,
          title: c.title,
          description: c.description,
          status: c.status,
          confidence: c.confidence,
          position: c.position,
          isUserModified: c.isUserModified,
        })),
        edges: diagram.edges.map(e => ({
          id: e.id,
          source: e.sourceComponentId,
          target: e.targetComponentId,
          type: e.edgeType,
          label: e.label,
        })),
        exportedAt: new Date().toISOString(),
      };
    }

    return null;
  }
}

export const diagramService = new DiagramService();
