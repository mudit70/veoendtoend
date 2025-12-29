# MVP2: End-to-End Flow Visualization
## VeoEndToEnd - Minimum Viable Product Phase 2

### 1. MVP2 Goal

Build on MVP1 (Operation Discovery) by adding the ability to generate visual end-to-end flow diagrams for discovered operations using a fixed template representing a typical web application architecture.

**Prerequisites from MVP1:**
- Document upload and text extraction
- LLM-based operation discovery
- Operations list with user corrections

**What's NEW in MVP2:**
- Fixed template for web application flows
- LLM-based detail extraction for each template component
- Visual diagram rendering (SVG/Canvas)
- Source attribution on diagram components
- Diagram export (PNG, SVG)

**What's OUT of scope for MVP2:**
- Custom templates (fixed template only)
- Template editor
- Diagram editing/modification
- Version history
- Multi-user collaboration

---

### 2. The Fixed Template

MVP2 uses a single, fixed template representing a standard web application request-response flow.

#### 2.1 Template Components (Left to Right)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     END-TO-END FLOW TEMPLATE                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│  │  USER    │     │  CLIENT  │     │ SECURITY │     │   API    │     │ BACKEND  │     │ DATABASE │     │
│  │  ACTION  │────▶│   CODE   │────▶│  LAYER   │────▶│ ENDPOINT │────▶│  LOGIC   │────▶│          │     │
│  │          │     │          │     │          │     │          │     │          │     │          │     │
│  └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘     │
│       │               │                 │                │               │               │              │
│       │               │                 │                │               │               │              │
│       │               │                 │                │               │◀──────────────┘              │
│       │               │                 │                │◀──────────────┘                              │
│       │               │                 │◀───────────────┘                                              │
│       │               │◀────────────────┘                                                               │
│       │◀──────────────┘                                                                                 │
│  ┌──────────┐     ┌──────────┐                                                                          │
│  │   VIEW   │◀────│  EVENT   │                                                                          │
│  │  UPDATE  │     │ HANDLER  │                                                                          │
│  └──────────┘     └──────────┘                                                                          │
│                                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 2.2 Component Definitions

| # | Component | Description | Example Details |
|---|-----------|-------------|-----------------|
| 1 | **User Action** | The user interaction that triggers the flow | "User clicks 'Add to Cart' button" |
| 2 | **Client Code** | Frontend code handling the user action | "CartComponent.addItem() in React" |
| 3 | **Security Layer** | Infrastructure the request passes through | Firewall, WAF, Load Balancer, API Gateway |
| 4 | **API Endpoint** | Backend API receiving the request | "POST /api/v1/cart/items" |
| 5 | **Backend Logic** | Business logic processing the request | "CartService.addItemToCart()" |
| 6 | **Database** | Data persistence operation | "INSERT into cart_items table" |
| 7 | **Event Handler** | Client code processing the response | "onCartUpdated callback" |
| 8 | **View Update** | UI changes shown to user | "Cart icon badge updates to show new count" |

#### 2.3 Security Layer Sub-components

The Security Layer is expanded to show:

```
┌─────────────────────────────────────────────────────────────────┐
│                       SECURITY LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Firewall │─▶│   WAF    │─▶│  Load    │─▶│   API    │        │
│  │          │  │          │  │ Balancer │  │ Gateway  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Architecture (Building on MVP1)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  MVP1       │  │   Diagram       │  │   Diagram           │  │
│  │  Components │  │   Canvas        │  │   Export            │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Node.js)                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  MVP1       │  │   Diagram       │  │   Detail            │  │
│  │  Endpoints  │  │   Generation    │  │   Extraction        │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  SQLite   │   │  File     │   │  LLM API  │
       │  (+ new   │   │  Storage  │   │  (Claude) │
       │  tables)  │   │           │   │           │
       └───────────┘   └───────────┘   └───────────┘
```

---

### 4. Data Model Extensions

#### 4.1 New Database Tables

```sql
-- Extends MVP1 schema

-- Diagrams generated for operations
CREATE TABLE diagrams (
    id TEXT PRIMARY KEY,
    operation_id TEXT REFERENCES operations(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Component details for each diagram
CREATE TABLE diagram_components (
    id TEXT PRIMARY KEY,
    diagram_id TEXT REFERENCES diagrams(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL,
    -- Component types: USER_ACTION, CLIENT_CODE, FIREWALL, WAF,
    -- LOAD_BALANCER, API_GATEWAY, API_ENDPOINT, BACKEND_LOGIC,
    -- DATABASE, EVENT_HANDLER, VIEW_UPDATE

    -- Content
    title TEXT,
    description TEXT,
    details JSON,                    -- Flexible additional details

    -- Status
    status TEXT DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'POPULATED', 'GREYED_OUT', 'ERROR')),
    confidence REAL,

    -- Source attribution
    source_excerpt TEXT,
    source_document_id TEXT REFERENCES documents(id),

    -- Position (for rendering)
    position_x INTEGER,
    position_y INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track diagram generation jobs
CREATE TABLE diagram_jobs (
    id TEXT PRIMARY KEY,
    diagram_id TEXT REFERENCES diagrams(id),
    status TEXT DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    current_step TEXT,              -- Which component is being processed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);
```

#### 4.2 Component Type Enum

```typescript
enum ComponentType {
  // Request Flow
  USER_ACTION = 'USER_ACTION',
  CLIENT_CODE = 'CLIENT_CODE',
  FIREWALL = 'FIREWALL',
  WAF = 'WAF',
  LOAD_BALANCER = 'LOAD_BALANCER',
  API_GATEWAY = 'API_GATEWAY',
  API_ENDPOINT = 'API_ENDPOINT',
  BACKEND_LOGIC = 'BACKEND_LOGIC',
  DATABASE = 'DATABASE',

  // Response Flow
  EVENT_HANDLER = 'EVENT_HANDLER',
  VIEW_UPDATE = 'VIEW_UPDATE'
}

interface DiagramComponent {
  id: string;
  diagramId: string;
  componentType: ComponentType;
  title: string;
  description: string;
  details: Record<string, any>;
  status: 'PENDING' | 'POPULATED' | 'GREYED_OUT' | 'ERROR';
  confidence: number;
  sourceExcerpt?: string;
  sourceDocumentId?: string;
  position: { x: number; y: number };
}
```

---

### 5. API Specification (New Endpoints)

#### 5.1 Generate Diagram

```
POST /api/projects/:projectId/operations/:operationId/diagrams

Request:
{
  "name": "Add to Cart Flow"        // Optional, defaults to operation name
}

Response:
{
  "diagramId": "uuid",
  "jobId": "uuid",
  "status": "GENERATING"
}
```

#### 5.2 Get Diagram Generation Status

```
GET /api/diagrams/:diagramId/status

Response:
{
  "diagramId": "uuid",
  "status": "GENERATING",
  "currentStep": "BACKEND_LOGIC",
  "progress": {
    "completed": 6,
    "total": 11
  }
}
```

#### 5.3 Get Diagram

```
GET /api/diagrams/:diagramId

Response:
{
  "diagram": {
    "id": "uuid",
    "name": "Add to Cart Flow",
    "operationId": "uuid",
    "status": "COMPLETED",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "components": [
    {
      "id": "uuid",
      "componentType": "USER_ACTION",
      "title": "Add to Cart Click",
      "description": "User clicks the 'Add to Cart' button on product page",
      "details": {
        "trigger": "onClick",
        "element": "button#add-to-cart"
      },
      "status": "POPULATED",
      "confidence": 0.89,
      "sourceExcerpt": "The add to cart button triggers...",
      "position": { "x": 50, "y": 200 }
    },
    // ... more components
  ]
}
```

#### 5.4 Export Diagram

```
POST /api/diagrams/:diagramId/export

Request:
{
  "format": "png" | "svg",
  "options": {
    "width": 1920,
    "includeSourceBadges": true
  }
}

Response:
{
  "downloadUrl": "/api/exports/abc123.png",
  "expiresAt": "2024-01-15T11:30:00Z"
}
```

#### 5.5 List Diagrams for Operation

```
GET /api/projects/:projectId/operations/:operationId/diagrams

Response:
{
  "diagrams": [
    {
      "id": "uuid",
      "name": "Add to Cart Flow",
      "status": "COMPLETED",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 6. Detail Extraction Engine

#### 6.1 Extraction Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   Load     │────▶│  For Each  │────▶│  Build     │────▶│  Call      │
│ Operation  │     │ Component  │     │  Prompt    │     │  LLM       │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
                         │                                     │
                         │    ┌────────────────────────────────┘
                         │    ▼
                         │  ┌────────────┐     ┌────────────┐
                         │  │  Parse     │────▶│  Store     │
                         │  │  Response  │     │  Component │
                         │  └────────────┘     └────────────┘
                         │                           │
                         └────── Loop ───────────────┘
```

#### 6.2 Component-Specific Prompts

```typescript
const COMPONENT_PROMPTS: Record<ComponentType, string> = {
  USER_ACTION: `
    For the operation "{operation_name}", identify the user action that triggers this flow.
    Look for:
    - What does the user do? (click, submit, navigate, etc.)
    - What UI element do they interact with?
    - What is the user's intent?

    Return JSON:
    {
      "title": "Brief title (3-5 words)",
      "description": "One sentence describing the user action",
      "details": {
        "trigger": "click|submit|navigate|input|...",
        "element": "Description of UI element",
        "userIntent": "What the user wants to achieve"
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }

    If no information found, return:
    { "status": "NOT_FOUND", "confidence": 0 }
  `,

  CLIENT_CODE: `
    For the operation "{operation_name}", identify the client-side code that handles this action.
    Look for:
    - Function or method name
    - Component or module name
    - Framework used (React, Vue, Angular, etc.)
    - What data is prepared for the API call

    Return JSON:
    {
      "title": "Brief title (e.g., 'CartService.addItem')",
      "description": "One sentence describing what the code does",
      "details": {
        "function": "Function/method name",
        "component": "Component or module name",
        "framework": "React|Vue|Angular|vanilla|...",
        "dataPreparation": "What data is gathered/formatted"
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }
  `,

  API_ENDPOINT: `
    For the operation "{operation_name}", identify the API endpoint called.
    Look for:
    - HTTP method (GET, POST, PUT, DELETE, etc.)
    - URL path
    - Request body structure
    - Authentication required

    Return JSON:
    {
      "title": "METHOD /path",
      "description": "One sentence describing the endpoint purpose",
      "details": {
        "method": "GET|POST|PUT|DELETE|PATCH",
        "path": "/api/v1/...",
        "requestBody": "Description of request payload",
        "authentication": "Bearer token|API key|Session|None",
        "responseType": "JSON|XML|..."
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }
  `,

  BACKEND_LOGIC: `
    For the operation "{operation_name}", identify the backend business logic.
    Look for:
    - Service or controller name
    - Business rules applied
    - Validations performed
    - External services called

    Return JSON:
    {
      "title": "Brief title (e.g., 'OrderService.processOrder')",
      "description": "One sentence describing the business logic",
      "details": {
        "service": "Service/controller name",
        "method": "Method name",
        "businessRules": ["List of rules applied"],
        "validations": ["List of validations"],
        "externalCalls": ["Any external services called"]
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }
  `,

  DATABASE: `
    For the operation "{operation_name}", identify database operations.
    Look for:
    - Tables accessed
    - Type of operation (read/write)
    - Query patterns
    - Data relationships

    Return JSON:
    {
      "title": "Brief title (e.g., 'Write to orders table')",
      "description": "One sentence describing the database operation",
      "details": {
        "operation": "READ|WRITE|READ_WRITE",
        "tables": ["List of tables"],
        "queryType": "SELECT|INSERT|UPDATE|DELETE|...",
        "relationships": "Any joins or related tables"
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }
  `,

  // Security components often have generic info
  FIREWALL: `
    For the operation "{operation_name}", identify any firewall configuration or rules mentioned.
    If no specific information, return general acknowledgment.

    Return JSON:
    {
      "title": "Network Firewall",
      "description": "Description or 'Standard network firewall protection'",
      "details": {
        "rules": ["Any specific rules mentioned"],
        "ports": ["Ports if mentioned"]
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote if available"
    }
  `,

  WAF: `
    For the operation "{operation_name}", identify Web Application Firewall details.
    Look for: WAF rules, security policies, OWASP protections.

    Return JSON with title, description, details, confidence, sourceExcerpt.
  `,

  LOAD_BALANCER: `
    For the operation "{operation_name}", identify load balancer configuration.
    Look for: Load balancing strategy, health checks, routing rules.

    Return JSON with title, description, details, confidence, sourceExcerpt.
  `,

  API_GATEWAY: `
    For the operation "{operation_name}", identify API gateway details.
    Look for: Rate limiting, authentication, request transformation, routing.

    Return JSON with title, description, details, confidence, sourceExcerpt.
  `,

  EVENT_HANDLER: `
    For the operation "{operation_name}", identify how the client handles the response.
    Look for:
    - Callback or promise handler
    - State updates
    - Error handling

    Return JSON:
    {
      "title": "Brief title (e.g., 'onSuccess callback')",
      "description": "One sentence describing response handling",
      "details": {
        "handler": "Function/callback name",
        "stateUpdates": ["What state is updated"],
        "errorHandling": "How errors are handled"
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }
  `,

  VIEW_UPDATE: `
    For the operation "{operation_name}", identify how the UI updates after the operation.
    Look for:
    - Visual changes
    - User feedback (notifications, messages)
    - Navigation changes

    Return JSON:
    {
      "title": "Brief title (e.g., 'Cart badge updates')",
      "description": "One sentence describing the UI update",
      "details": {
        "visualChanges": ["List of UI changes"],
        "userFeedback": "Toast/notification/message shown",
        "navigation": "Any navigation that occurs"
      },
      "confidence": 0.0-1.0,
      "sourceExcerpt": "Quote from documentation"
    }
  `
};
```

#### 6.3 Master Extraction Prompt

For efficiency, we can also do a single extraction call:

```typescript
const FULL_EXTRACTION_PROMPT = `
You are analyzing documentation to extract details for an end-to-end flow diagram.

OPERATION: {operation_name}
DESCRIPTION: {operation_description}

Analyze the following documentation and extract details for EACH component of a web application flow.

DOCUMENTATION:
---
{corpus_content}
---

For each component, provide details or indicate if no information was found.
Return a JSON object with keys for each component type:

{
  "USER_ACTION": {
    "found": true/false,
    "title": "...",
    "description": "...",
    "details": {...},
    "confidence": 0.0-1.0,
    "sourceExcerpt": "..."
  },
  "CLIENT_CODE": { ... },
  "FIREWALL": { ... },
  "WAF": { ... },
  "LOAD_BALANCER": { ... },
  "API_GATEWAY": { ... },
  "API_ENDPOINT": { ... },
  "BACKEND_LOGIC": { ... },
  "DATABASE": { ... },
  "EVENT_HANDLER": { ... },
  "VIEW_UPDATE": { ... }
}

For infrastructure components (FIREWALL, WAF, LOAD_BALANCER, API_GATEWAY), if no specific
information is found, you may provide generic descriptions appropriate for a web application.

Mark "found": false for components with no relevant information in the corpus.
`;
```

#### 6.4 Extraction Service Implementation

```typescript
interface ExtractionResult {
  componentType: ComponentType;
  found: boolean;
  title: string;
  description: string;
  details: Record<string, any>;
  confidence: number;
  sourceExcerpt?: string;
}

async function extractDiagramDetails(
  operation: Operation,
  documents: Document[]
): Promise<ExtractionResult[]> {

  // Combine all document content
  const corpusContent = documents
    .map(d => `## ${d.filename}\n${d.content}`)
    .join('\n\n---\n\n');

  // Build the prompt
  const prompt = FULL_EXTRACTION_PROMPT
    .replace('{operation_name}', operation.name)
    .replace('{operation_description}', operation.description)
    .replace('{corpus_content}', corpusContent);

  // Call LLM
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  // Parse response
  const extracted = JSON.parse(response.content[0].text);

  // Convert to array of results
  const results: ExtractionResult[] = [];
  for (const componentType of Object.values(ComponentType)) {
    const data = extracted[componentType];
    results.push({
      componentType,
      found: data?.found ?? false,
      title: data?.title ?? getDefaultTitle(componentType),
      description: data?.description ?? getDefaultDescription(componentType),
      details: data?.details ?? {},
      confidence: data?.confidence ?? 0,
      sourceExcerpt: data?.sourceExcerpt
    });
  }

  return results;
}

function getDefaultTitle(type: ComponentType): string {
  const defaults: Record<ComponentType, string> = {
    USER_ACTION: 'User Action',
    CLIENT_CODE: 'Client Handler',
    FIREWALL: 'Network Firewall',
    WAF: 'Web Application Firewall',
    LOAD_BALANCER: 'Load Balancer',
    API_GATEWAY: 'API Gateway',
    API_ENDPOINT: 'API Endpoint',
    BACKEND_LOGIC: 'Backend Service',
    DATABASE: 'Database',
    EVENT_HANDLER: 'Response Handler',
    VIEW_UPDATE: 'View Update'
  };
  return defaults[type];
}

function getDefaultDescription(type: ComponentType): string {
  const defaults: Record<ComponentType, string> = {
    USER_ACTION: 'User initiates the operation',
    CLIENT_CODE: 'Client-side code processes the action',
    FIREWALL: 'Network-level security filtering',
    WAF: 'Application-layer security protection',
    LOAD_BALANCER: 'Distributes traffic across servers',
    API_GATEWAY: 'Routes and manages API requests',
    API_ENDPOINT: 'Backend API receives request',
    BACKEND_LOGIC: 'Business logic processes request',
    DATABASE: 'Data persistence layer',
    EVENT_HANDLER: 'Handles API response',
    VIEW_UPDATE: 'UI reflects the result'
  };
  return defaults[type];
}
```

---

### 7. Diagram Rendering

#### 7.1 Layout Configuration

```typescript
const LAYOUT_CONFIG = {
  canvas: {
    width: 1400,
    height: 600,
    padding: 40
  },

  component: {
    width: 140,
    height: 80,
    gap: 30
  },

  securityLayer: {
    subComponentWidth: 100,
    subComponentHeight: 50,
    gap: 15
  },

  colors: {
    populated: '#4CAF50',      // Green - has data
    greyedOut: '#9E9E9E',      // Grey - no data
    error: '#F44336',          // Red - extraction failed
    pending: '#FFC107',        // Yellow - processing

    // Component type colors
    userAction: '#2196F3',     // Blue
    clientCode: '#673AB7',     // Purple
    security: '#FF9800',       // Orange
    backend: '#009688',        // Teal
    database: '#795548',       // Brown
    response: '#E91E63'        // Pink
  },

  arrows: {
    strokeWidth: 2,
    headSize: 8,
    requestColor: '#333',
    responseColor: '#666'
  }
};
```

#### 7.2 Component Positions

```typescript
const COMPONENT_POSITIONS: Record<ComponentType, { x: number; y: number; row: 'main' | 'security' | 'response' }> = {
  USER_ACTION:    { x: 0,   y: 0, row: 'main' },
  CLIENT_CODE:    { x: 1,   y: 0, row: 'main' },
  // Security layer components
  FIREWALL:       { x: 0,   y: 0, row: 'security' },
  WAF:            { x: 1,   y: 0, row: 'security' },
  LOAD_BALANCER:  { x: 2,   y: 0, row: 'security' },
  API_GATEWAY:    { x: 3,   y: 0, row: 'security' },
  // Continue main flow
  API_ENDPOINT:   { x: 3,   y: 0, row: 'main' },
  BACKEND_LOGIC:  { x: 4,   y: 0, row: 'main' },
  DATABASE:       { x: 5,   y: 0, row: 'main' },
  // Response flow
  EVENT_HANDLER:  { x: 1,   y: 0, row: 'response' },
  VIEW_UPDATE:    { x: 0,   y: 0, row: 'response' }
};
```

#### 7.3 Rendering with React + SVG

```tsx
// DiagramCanvas.tsx
import React from 'react';
import { DiagramComponent, LAYOUT_CONFIG } from './types';

interface DiagramCanvasProps {
  components: DiagramComponent[];
  diagramName: string;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  components,
  diagramName
}) => {
  const { canvas, component, colors } = LAYOUT_CONFIG;

  return (
    <svg
      width={canvas.width}
      height={canvas.height}
      className="diagram-canvas"
    >
      {/* Background */}
      <rect width="100%" height="100%" fill="#fafafa" />

      {/* Title */}
      <text x={canvas.padding} y={30} className="diagram-title">
        {diagramName}
      </text>

      {/* Main Flow Row */}
      <g transform={`translate(${canvas.padding}, 80)`}>
        <FlowRow
          components={components.filter(c =>
            ['USER_ACTION', 'CLIENT_CODE', 'API_ENDPOINT', 'BACKEND_LOGIC', 'DATABASE']
              .includes(c.componentType)
          )}
        />
      </g>

      {/* Security Layer (expanded) */}
      <g transform={`translate(${canvas.padding + 280}, 180)`}>
        <SecurityLayer
          components={components.filter(c =>
            ['FIREWALL', 'WAF', 'LOAD_BALANCER', 'API_GATEWAY']
              .includes(c.componentType)
          )}
        />
      </g>

      {/* Response Flow Row */}
      <g transform={`translate(${canvas.padding}, 380)`}>
        <FlowRow
          components={components.filter(c =>
            ['EVENT_HANDLER', 'VIEW_UPDATE'].includes(c.componentType)
          )}
          isResponseFlow
        />
      </g>

      {/* Connection Arrows */}
      <ConnectionArrows components={components} />
    </svg>
  );
};

const ComponentBox: React.FC<{ component: DiagramComponent }> = ({ component }) => {
  const { width, height } = LAYOUT_CONFIG.component;
  const statusColor = getStatusColor(component.status);

  return (
    <g className="component-box">
      {/* Box */}
      <rect
        width={width}
        height={height}
        rx={8}
        fill="white"
        stroke={statusColor}
        strokeWidth={2}
      />

      {/* Title */}
      <text x={width/2} y={25} textAnchor="middle" className="component-title">
        {component.title}
      </text>

      {/* Description (truncated) */}
      <text x={width/2} y={45} textAnchor="middle" className="component-desc">
        {truncate(component.description, 25)}
      </text>

      {/* Confidence indicator */}
      {component.status === 'POPULATED' && (
        <ConfidenceBadge confidence={component.confidence} x={width - 30} y={height - 20} />
      )}

      {/* Source indicator */}
      {component.sourceExcerpt && (
        <SourceBadge x={10} y={height - 20} />
      )}

      {/* Greyed out overlay */}
      {component.status === 'GREYED_OUT' && (
        <rect
          width={width}
          height={height}
          rx={8}
          fill="rgba(158, 158, 158, 0.3)"
        />
      )}
    </g>
  );
};

const SecurityLayer: React.FC<{ components: DiagramComponent[] }> = ({ components }) => {
  const { subComponentWidth, subComponentHeight, gap } = LAYOUT_CONFIG.securityLayer;

  return (
    <g className="security-layer">
      {/* Container */}
      <rect
        width={4 * subComponentWidth + 3 * gap + 40}
        height={subComponentHeight + 60}
        rx={12}
        fill="#FFF3E0"
        stroke="#FF9800"
        strokeWidth={1}
      />

      {/* Label */}
      <text x={20} y={25} className="layer-label">Security Layer</text>

      {/* Sub-components */}
      {components.map((comp, i) => (
        <g key={comp.id} transform={`translate(${20 + i * (subComponentWidth + gap)}, 35)`}>
          <SecuritySubComponent component={comp} />
        </g>
      ))}
    </g>
  );
};
```

#### 7.4 Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Add to Cart Flow                                                                                               │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│   ┌─────────────┐      ┌─────────────┐                    ┌─────────────┐      ┌─────────────┐      ┌─────────┐│
│   │ 🟢 Add to   │ ───▶ │ 🟢 Cart     │ ─────────────────▶ │ 🟢 POST     │ ───▶ │ 🟢 Cart     │ ───▶ │ 🟢 Write││
│   │ Cart Click  │      │ Component   │                    │ /api/cart   │      │ Service     │      │ cart_   ││
│   │             │      │             │                    │             │      │             │      │ items   ││
│   │ 92%   📎    │      │ 88%   📎    │                    │ 95%   📎    │      │ 85%   📎    │      │ 78%  📎 ││
│   └─────────────┘      └─────────────┘                    └─────────────┘      └─────────────┘      └─────────┘│
│                              │                                   ▲                                       │      │
│                              │                                   │                                       │      │
│                              ▼                                   │                                       │      │
│                    ┌─────────────────────────────────────────────────────────────────┐                   │      │
│                    │  Security Layer                                                  │                   │      │
│                    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │                   │      │
│                    │  │ ⚪ Fire- │─▶│ ⚪ WAF   │─▶│ ⚪ Load  │─▶│ ⚪ API   │        │                   │      │
│                    │  │   wall   │  │          │  │ Balancer │  │ Gateway  │        │                   │      │
│                    │  │  0%      │  │  0%      │  │  0%      │  │  0%      │        │                   │      │
│                    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │                   │      │
│                    └─────────────────────────────────────────────────────────────────┘                   │      │
│                                                                                                           │      │
│                              ┌─────────────────────────────────────────────────────────────────────────────┘      │
│                              │                                                                                    │
│                              ▼                                                                                    │
│   ┌─────────────┐      ┌─────────────┐                                                                           │
│   │ 🟢 Cart     │ ◀─── │ 🟢 onCart   │ ◀──────────────────────────────────────────────────────────────           │
│   │ Badge       │      │ Updated     │                                                                           │
│   │ Updates     │      │ Callback    │                                                                           │
│   │ 90%   📎    │      │ 82%   📎    │                                                                           │
│   └─────────────┘      └─────────────┘                                                                           │
│                                                                                                                  │
│   Legend:  🟢 Populated (data found)   ⚪ Greyed Out (no data)   📎 Has source reference                        │
│                                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 8. Export Functionality

#### 8.1 SVG Export

```typescript
async function exportAsSVG(diagramId: string): Promise<string> {
  const diagram = await getDiagram(diagramId);
  const svgContent = renderDiagramToSVG(diagram);

  // Add XML declaration and styling
  return `<?xml version="1.0" encoding="UTF-8"?>
    ${svgContent}`;
}
```

#### 8.2 PNG Export (using Puppeteer or Sharp)

```typescript
import puppeteer from 'puppeteer';

async function exportAsPNG(diagramId: string, width: number = 1920): Promise<Buffer> {
  const svgContent = await exportAsSVG(diagramId);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;">
        ${svgContent}
      </body>
    </html>
  `);

  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: true
  });

  await browser.close();
  return screenshot;
}
```

---

### 9. Frontend Components (New)

```
src/
├── components/
│   ├── ... (MVP1 components)
│   │
│   ├── diagram/
│   │   ├── DiagramCanvas.tsx       # Main SVG canvas
│   │   ├── ComponentBox.tsx        # Single component rendering
│   │   ├── SecurityLayer.tsx       # Security layer group
│   │   ├── ConnectionArrows.tsx    # Arrows between components
│   │   ├── ConfidenceBadge.tsx     # Confidence indicator
│   │   ├── SourceBadge.tsx         # Source attribution indicator
│   │   ├── ComponentTooltip.tsx    # Hover details
│   │   └── Legend.tsx              # Diagram legend
│   │
│   ├── DiagramGenerateButton.tsx   # Trigger generation
│   ├── DiagramStatus.tsx           # Generation progress
│   ├── DiagramViewer.tsx           # Full diagram view page
│   └── DiagramExport.tsx           # Export options
```

---

### 10. User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MVP2 User Flow                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

MVP1 Flow (unchanged):
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Upload  │────▶│  Run     │────▶│  Review  │────▶│  Confirm │
│  Docs    │     │ Discovery│     │  List    │     │  Ops     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
MVP2 Addition:                              ┌──────────────────────┐
                                            │ Select an operation  │
                                            └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │ [Generate Diagram]   │
                                            └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │ View progress:       │
                                            │ "Extracting API..."  │
                                            └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │ View diagram         │
                                            │ - See populated      │
                                            │   components         │
                                            │ - See greyed out     │
                                            │   (no data found)    │
                                            │ - Hover for details  │
                                            │ - Click 📎 for source│
                                            └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │ [Export PNG] [SVG]   │
                                            └──────────────────────┘
```

---

### 11. Implementation Steps

#### Phase 1: Data Model & API (Day 1-2)
1. Add new database tables (diagrams, diagram_components, diagram_jobs)
2. Create diagram CRUD endpoints
3. Create diagram generation job endpoint
4. Implement job status tracking

#### Phase 2: Extraction Engine (Day 3-4)
1. Create component-specific prompts
2. Implement full extraction prompt
3. Build extraction service with LLM calls
4. Handle partial/missing data (greyed out components)
5. Store extracted components with source attribution

#### Phase 3: Diagram Rendering (Day 5-7)
1. Set up SVG canvas component
2. Implement component box rendering
3. Build security layer group
4. Add connection arrows
5. Implement hover tooltips
6. Add confidence and source badges
7. Create legend

#### Phase 4: Export & Polish (Day 8-9)
1. Implement SVG export
2. Implement PNG export
3. Add export UI
4. Loading states and error handling
5. Responsive canvas sizing

#### Phase 5: Integration & Testing (Day 10)
1. Integration with MVP1 operations list
2. End-to-end testing
3. Performance optimization
4. Deploy

---

### 12. Cost Estimation

#### LLM Costs (Claude 3 Haiku)

| Scenario | Est. Input Tokens | Est. Output Tokens | Cost per Diagram |
|----------|-------------------|--------------------|--------------------|
| Small corpus (10 pages) | ~8,000 | ~2,000 | ~$0.005 |
| Medium corpus (50 pages) | ~30,000 | ~2,500 | ~$0.01 |
| Large corpus (200 pages) | ~120,000 | ~3,000 | ~$0.04 |

*Extraction is more expensive than discovery due to detailed prompting*

#### Infrastructure

Same as MVP1 - near zero with free tier hosting.

---

### 13. Success Criteria

The MVP2 is successful if:

1. Diagrams generate in under 90 seconds for typical corpus
2. At least 60% of components have meaningful extracted data
3. Components without data are clearly marked as greyed out
4. Source attribution is visible and accurate
5. Export produces clean PNG/SVG files
6. Users can understand the flow at a glance

---

### 14. Limitations (Addressed in Future MVPs)

| Limitation | Future Enhancement |
|------------|-------------------|
| Fixed template only | MVP3: Custom templates |
| No diagram editing | MVP3: Interactive editing |
| Single export per operation | MVP3: Multiple diagram versions |
| No source navigation | MVP3: Click source to jump to document |
| Basic styling | MVP4: Theming and customization |

---

*Document Version: 1.0*
*Builds on: MVP1 (Operation Discovery)*
*Created for MVP2 Development Sprint*
