import type { ComponentType, DiagramComponent } from '@veoendtoend/shared';
import { llmClient } from './llmClient';

// Extraction prompt templates for each component type
const EXTRACTION_PROMPTS: Record<ComponentType, string> = {
  USER_ACTION: `Extract user action details:
- What action does the user perform?
- What triggers this action (button click, form submission, etc.)?
- What data does the user provide?

Respond in JSON format:
{
  "title": "User Action title",
  "description": "Detailed description of the user action",
  "sourceExcerpt": "Relevant quote from document"
}`,

  CLIENT_CODE: `Extract client-side code details:
- What client framework/library is used?
- What happens on the client when this operation is triggered?
- How is the request prepared?

Respond in JSON format:
{
  "title": "Client Code title",
  "description": "Description of client-side handling",
  "sourceExcerpt": "Relevant quote from document"
}`,

  FIREWALL: `Extract firewall configuration details:
- Is there a network firewall mentioned?
- What rules or filtering is applied?
- What ports or protocols are used?

Respond in JSON format:
{
  "title": "Firewall title",
  "description": "Description of firewall configuration",
  "sourceExcerpt": "Relevant quote from document"
}`,

  WAF: `Extract Web Application Firewall details:
- Is there a WAF mentioned?
- What security rules are applied?
- What attacks does it prevent?

Respond in JSON format:
{
  "title": "WAF title",
  "description": "Description of WAF configuration",
  "sourceExcerpt": "Relevant quote from document"
}`,

  LOAD_BALANCER: `Extract load balancer details:
- Is there a load balancer mentioned?
- What balancing algorithm is used?
- How many instances/servers are involved?

Respond in JSON format:
{
  "title": "Load Balancer title",
  "description": "Description of load balancing",
  "sourceExcerpt": "Relevant quote from document"
}`,

  API_GATEWAY: `Extract API gateway details:
- Is there an API gateway mentioned?
- What routing rules are applied?
- What authentication/authorization is handled here?

Respond in JSON format:
{
  "title": "API Gateway title",
  "description": "Description of API gateway",
  "sourceExcerpt": "Relevant quote from document"
}`,

  API_ENDPOINT: `Extract API endpoint details:
- What is the endpoint URL/path?
- What HTTP method is used?
- What parameters does it accept?

Respond in JSON format:
{
  "title": "API Endpoint title",
  "description": "Description of the API endpoint",
  "sourceExcerpt": "Relevant quote from document"
}`,

  BACKEND_LOGIC: `Extract backend logic details:
- What business logic is executed?
- What validations are performed?
- What processing steps occur?

Respond in JSON format:
{
  "title": "Backend Logic title",
  "description": "Description of backend processing",
  "sourceExcerpt": "Relevant quote from document"
}`,

  DATABASE: `Extract database details:
- What database is used?
- What data is read/written?
- What queries or operations are performed?

Respond in JSON format:
{
  "title": "Database title",
  "description": "Description of database operations",
  "sourceExcerpt": "Relevant quote from document"
}`,

  EVENT_HANDLER: `Extract event handler details:
- What events are triggered?
- What async processing occurs?
- What subscribers/handlers respond?

Respond in JSON format:
{
  "title": "Event Handler title",
  "description": "Description of event handling",
  "sourceExcerpt": "Relevant quote from document"
}`,

  VIEW_UPDATE: `Extract view update details:
- How is the UI updated after the response?
- What state changes occur?
- What visual feedback is provided?

Respond in JSON format:
{
  "title": "View Update title",
  "description": "Description of view updates",
  "sourceExcerpt": "Relevant quote from document"
}`,
};

// Keywords to detect for each component type
const COMPONENT_KEYWORDS: Record<ComponentType, string[]> = {
  USER_ACTION: ['user', 'click', 'submit', 'press', 'enter', 'select', 'action', 'trigger', 'button', 'form'],
  CLIENT_CODE: ['frontend', 'client', 'react', 'vue', 'angular', 'javascript', 'typescript', 'browser', 'ajax', 'fetch'],
  FIREWALL: ['firewall', 'network security', 'port', 'iptables', 'security group', 'inbound', 'outbound'],
  WAF: ['waf', 'web application firewall', 'cloudflare', 'aws waf', 'security rule', 'owasp'],
  LOAD_BALANCER: ['load balancer', 'nginx', 'haproxy', 'elb', 'alb', 'round robin', 'scaling'],
  API_GATEWAY: ['api gateway', 'kong', 'apigee', 'aws api gateway', 'routing', 'rate limit', 'throttle'],
  API_ENDPOINT: ['endpoint', 'api', 'rest', 'graphql', 'post', 'get', 'put', 'delete', 'route', 'path', 'url'],
  BACKEND_LOGIC: ['service', 'business logic', 'validate', 'process', 'transform', 'controller', 'handler'],
  DATABASE: ['database', 'db', 'sql', 'mongodb', 'postgres', 'mysql', 'query', 'insert', 'update', 'table'],
  EVENT_HANDLER: ['event', 'queue', 'kafka', 'rabbitmq', 'pub/sub', 'async', 'message', 'handler', 'listener'],
  VIEW_UPDATE: ['render', 'display', 'update', 'state', 'ui', 'component', 'view', 'refresh', 'show'],
};

export interface ExtractionResult {
  title: string;
  description: string;
  sourceExcerpt?: string;
  sourceDocumentId?: string;
  confidence: number;
  hasData: boolean;
}

export interface DocumentContent {
  id: string;
  filename: string;
  content: string;
}

export class ExtractionEngine {
  /**
   * Determine if a document contains relevant information for a component type
   */
  detectComponentData(
    componentType: ComponentType,
    documents: DocumentContent[]
  ): { hasData: boolean; relevantDocument?: DocumentContent; confidence: number } {
    const keywords = COMPONENT_KEYWORDS[componentType];

    for (const doc of documents) {
      const contentLower = doc.content.toLowerCase();
      const matchCount = keywords.filter(kw => contentLower.includes(kw.toLowerCase())).length;

      if (matchCount >= 2) {
        // Found at least 2 keywords - high confidence
        return { hasData: true, relevantDocument: doc, confidence: Math.min(0.9, 0.5 + matchCount * 0.1) };
      } else if (matchCount === 1) {
        // Found 1 keyword - low confidence
        return { hasData: true, relevantDocument: doc, confidence: 0.4 };
      }
    }

    return { hasData: false, confidence: 0 };
  }

  /**
   * Extract details for a specific component type from documents
   */
  async extractComponentDetails(
    componentType: ComponentType,
    operationName: string,
    operationDescription: string,
    documents: DocumentContent[]
  ): Promise<ExtractionResult> {
    // First check if we have relevant data
    const detection = this.detectComponentData(componentType, documents);

    if (!detection.hasData || !detection.relevantDocument) {
      return {
        title: this.getDefaultTitle(componentType),
        description: 'No relevant data found in documents',
        confidence: 0,
        hasData: false,
      };
    }

    // Try to extract using LLM
    try {
      const prompt = this.buildExtractionPrompt(
        componentType,
        operationName,
        operationDescription,
        detection.relevantDocument.content
      );

      // Use mock extraction for now (in production, this would call LLM)
      const result = this.mockExtraction(
        componentType,
        operationName,
        detection.relevantDocument
      );

      return {
        ...result,
        sourceDocumentId: detection.relevantDocument.id,
        confidence: detection.confidence,
        hasData: true,
      };
    } catch (error) {
      // Fall back to basic extraction
      return {
        title: this.getDefaultTitle(componentType),
        description: `Handles ${componentType.toLowerCase().replace('_', ' ')} for ${operationName}`,
        sourceDocumentId: detection.relevantDocument.id,
        sourceExcerpt: this.findRelevantExcerpt(componentType, detection.relevantDocument.content),
        confidence: detection.confidence * 0.5,
        hasData: true,
      };
    }
  }

  /**
   * Extract details for all component types
   */
  async extractAllComponents(
    operationName: string,
    operationDescription: string,
    documents: DocumentContent[]
  ): Promise<Map<ComponentType, ExtractionResult>> {
    const results = new Map<ComponentType, ExtractionResult>();
    const componentTypes: ComponentType[] = [
      'USER_ACTION', 'CLIENT_CODE', 'FIREWALL', 'WAF', 'LOAD_BALANCER',
      'API_GATEWAY', 'API_ENDPOINT', 'BACKEND_LOGIC', 'DATABASE',
      'EVENT_HANDLER', 'VIEW_UPDATE'
    ];

    for (const componentType of componentTypes) {
      const result = await this.extractComponentDetails(
        componentType,
        operationName,
        operationDescription,
        documents
      );
      results.set(componentType, result);
    }

    return results;
  }

  private buildExtractionPrompt(
    componentType: ComponentType,
    operationName: string,
    operationDescription: string,
    documentContent: string
  ): string {
    const basePrompt = EXTRACTION_PROMPTS[componentType];
    return `
Operation: ${operationName}
Description: ${operationDescription}

Document content:
${documentContent.slice(0, 3000)}

${basePrompt}

If no relevant information is found, respond with:
{
  "title": null,
  "description": null,
  "sourceExcerpt": null
}
`;
  }

  private mockExtraction(
    componentType: ComponentType,
    operationName: string,
    document: DocumentContent
  ): { title: string; description: string; sourceExcerpt: string } {
    const titles: Record<ComponentType, string> = {
      USER_ACTION: `User initiates ${operationName}`,
      CLIENT_CODE: `Client ${operationName} handler`,
      FIREWALL: 'Network Firewall',
      WAF: 'Web Application Firewall',
      LOAD_BALANCER: 'Load Balancer',
      API_GATEWAY: 'API Gateway',
      API_ENDPOINT: `${operationName} Endpoint`,
      BACKEND_LOGIC: `${operationName} Service`,
      DATABASE: 'Data Store',
      EVENT_HANDLER: 'Event Processor',
      VIEW_UPDATE: 'UI Update Handler',
    };

    const descriptions: Record<ComponentType, string> = {
      USER_ACTION: `User triggers ${operationName} through the interface`,
      CLIENT_CODE: `Client-side code handles ${operationName} request preparation`,
      FIREWALL: 'Filters network traffic before reaching the application',
      WAF: 'Validates requests and prevents common web attacks',
      LOAD_BALANCER: 'Distributes incoming requests across available servers',
      API_GATEWAY: 'Routes and authenticates API requests',
      API_ENDPOINT: `API endpoint that processes ${operationName}`,
      BACKEND_LOGIC: `Business logic for ${operationName} operation`,
      DATABASE: 'Persists and retrieves operation data',
      EVENT_HANDLER: 'Handles asynchronous events from the operation',
      VIEW_UPDATE: 'Updates the user interface with operation results',
    };

    return {
      title: titles[componentType],
      description: descriptions[componentType],
      sourceExcerpt: this.findRelevantExcerpt(componentType, document.content),
    };
  }

  private findRelevantExcerpt(componentType: ComponentType, content: string): string {
    const keywords = COMPONENT_KEYWORDS[componentType];
    const lines = content.split('\n');

    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (keywords.some(kw => lineLower.includes(kw.toLowerCase()))) {
        // Return the line with some context
        const trimmed = line.trim();
        if (trimmed.length > 10) {
          return trimmed.slice(0, 200) + (trimmed.length > 200 ? '...' : '');
        }
      }
    }

    // Return first non-empty line as fallback
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        return trimmed.slice(0, 200) + (trimmed.length > 200 ? '...' : '');
      }
    }

    return '';
  }

  private getDefaultTitle(componentType: ComponentType): string {
    const titles: Record<ComponentType, string> = {
      USER_ACTION: 'User Action',
      CLIENT_CODE: 'Client Code',
      FIREWALL: 'Firewall',
      WAF: 'WAF',
      LOAD_BALANCER: 'Load Balancer',
      API_GATEWAY: 'API Gateway',
      API_ENDPOINT: 'API Endpoint',
      BACKEND_LOGIC: 'Backend Logic',
      DATABASE: 'Database',
      EVENT_HANDLER: 'Event Handler',
      VIEW_UPDATE: 'View Update',
    };
    return titles[componentType];
  }

  /**
   * Get the extraction prompt template for a component type
   */
  getPromptTemplate(componentType: ComponentType): string {
    return EXTRACTION_PROMPTS[componentType];
  }

  /**
   * Get keywords for detecting a component type in documents
   */
  getComponentKeywords(componentType: ComponentType): string[] {
    return COMPONENT_KEYWORDS[componentType];
  }
}

export const extractionEngine = new ExtractionEngine();
