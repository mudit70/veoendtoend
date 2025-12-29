import type { Diagram, DiagramComponent, DiagramEdge, ComponentType, Job } from '@veoendtoend/shared';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';

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
    const operation = db.getOperationById(operationId);
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
      const operation = db.getOperationById(operationId);
      if (!operation) {
        throw new Error('Operation not found');
      }

      // Get documents for the operation's project
      const documents = db.getDocumentsByProjectId(operation.projectId);

      // Create components (in a real implementation, this would use LLM)
      const components: DiagramComponent[] = [];
      const componentMap = new Map<ComponentType, string>();
      const now = new Date().toISOString();

      let progress = 10;
      for (const template of TEMPLATE_COMPONENTS) {
        const componentId = uuidv4();
        componentMap.set(template.type, componentId);

        // Determine if we have data for this component (mock logic)
        const hasData = this.componentHasData(template.type, operation, documents);

        const component: DiagramComponent = {
          id: componentId,
          diagramId,
          componentType: template.type,
          title: template.title,
          description: hasData
            ? this.getComponentDescription(template.type, operation)
            : 'No relevant data found in documents',
          status: hasData ? 'POPULATED' : 'GREYED_OUT',
          confidence: hasData ? 0.85 : 0,
          position: template.position,
          isUserModified: false,
          createdAt: now,
          updatedAt: now,
        };

        if (hasData && documents.length > 0) {
          component.sourceDocumentId = documents[0].id;
          component.sourceExcerpt = `Relevant excerpt for ${template.title}`;
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

  private componentHasData(
    componentType: ComponentType,
    _operation: { name: string; description: string; type: string },
    documents: { content: string }[]
  ): boolean {
    // Mock logic: determine if documents contain relevant data for this component
    const hasDocuments = documents.length > 0;

    // Always populate core components
    if (['USER_ACTION', 'CLIENT_CODE', 'API_ENDPOINT', 'BACKEND_LOGIC'].includes(componentType)) {
      return true;
    }

    // Conditionally populate based on document presence
    if (['DATABASE', 'VIEW_UPDATE'].includes(componentType)) {
      return hasDocuments;
    }

    // Infrastructure components may or may not have data
    if (['FIREWALL', 'WAF', 'LOAD_BALANCER', 'API_GATEWAY'].includes(componentType)) {
      return hasDocuments && Math.random() > 0.3;
    }

    // Event handler
    return hasDocuments && Math.random() > 0.5;
  }

  private getComponentDescription(componentType: ComponentType, operation: { name: string; description: string }): string {
    const descriptions: Record<ComponentType, string> = {
      USER_ACTION: `User initiates ${operation.name}`,
      CLIENT_CODE: `Client handles ${operation.name} request`,
      FIREWALL: 'Network firewall filters incoming traffic',
      WAF: 'Web Application Firewall validates request',
      LOAD_BALANCER: 'Distributes request to available servers',
      API_GATEWAY: 'Routes request to appropriate service',
      API_ENDPOINT: `Endpoint processes ${operation.name}`,
      BACKEND_LOGIC: `Business logic for ${operation.name}`,
      DATABASE: 'Persists or retrieves data',
      EVENT_HANDLER: 'Handles async events',
      VIEW_UPDATE: 'Updates client view with response',
    };
    return descriptions[componentType] || operation.description;
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
        const { components: _c, edges: _e, ...diagramBase } = diagram;
        diagrams.push(diagramBase);
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

    const { components: _c, edges: _e, ...diagramBase } = diagram;
    return diagramBase;
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
