# MVP2: End-to-End Flow Visualization
## VeoEndToEnd - Minimum Viable Product Phase 2

### 1. MVP2 Goal

Build on MVP1 (Operation Discovery) by adding the ability to generate, **edit**, and **save** visual end-to-end flow diagrams for discovered operations using a fixed template representing a typical web application architecture.

**Prerequisites from MVP1:**
- Document upload and text extraction
- LLM-based operation discovery
- Operations list with user corrections

**What's NEW in MVP2:**
- Fixed template for web application flows
- LLM-based detail extraction for each template component
- **Interactive diagram rendering using ReactFlow library**
- **User can modify diagram components (edit text, reposition nodes)**
- **User can save modified diagrams for future use**
- Source attribution on diagram components
- Diagram export (PNG, SVG, JSON)

**What's OUT of scope for MVP2:**
- Custom templates (fixed template only)
- Template editor
- Version history / diff view
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
│  │  MVP1       │  │   ReactFlow     │  │   Diagram           │  │
│  │  Components │  │   Editor        │  │   Export            │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Node.js)                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  MVP1       │  │   Diagram       │  │   Detail            │  │
│  │  Endpoints  │  │   CRUD + Save   │  │   Extraction        │  │
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

    -- User modification tracking
    is_modified BOOLEAN DEFAULT FALSE,
    last_saved_at TIMESTAMP,
    last_saved_by TEXT,

    -- ReactFlow state (stored as JSON)
    viewport JSON,                   -- { x, y, zoom }

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

    -- Content (user-editable)
    title TEXT,
    description TEXT,
    details JSON,                    -- Flexible additional details

    -- Status
    status TEXT DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'POPULATED', 'GREYED_OUT', 'ERROR')),
    confidence REAL,

    -- Source attribution (from LLM extraction)
    source_excerpt TEXT,
    source_document_id TEXT REFERENCES documents(id),

    -- ReactFlow node position (user-adjustable)
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,

    -- Track user modifications
    is_user_modified BOOLEAN DEFAULT FALSE,
    original_title TEXT,             -- Store original for reset
    original_description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Edges/connections between components
CREATE TABLE diagram_edges (
    id TEXT PRIMARY KEY,
    diagram_id TEXT REFERENCES diagrams(id) ON DELETE CASCADE,
    source_component_id TEXT REFERENCES diagram_components(id),
    target_component_id TEXT REFERENCES diagram_components(id),
    edge_type TEXT DEFAULT 'default',  -- 'default', 'animated', 'step'
    label TEXT,
    style JSON,                        -- Custom styling

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

#### 4.2 TypeScript Types

```typescript
// Component types
enum ComponentType {
  USER_ACTION = 'USER_ACTION',
  CLIENT_CODE = 'CLIENT_CODE',
  FIREWALL = 'FIREWALL',
  WAF = 'WAF',
  LOAD_BALANCER = 'LOAD_BALANCER',
  API_GATEWAY = 'API_GATEWAY',
  API_ENDPOINT = 'API_ENDPOINT',
  BACKEND_LOGIC = 'BACKEND_LOGIC',
  DATABASE = 'DATABASE',
  EVENT_HANDLER = 'EVENT_HANDLER',
  VIEW_UPDATE = 'VIEW_UPDATE'
}

// Diagram component (maps to ReactFlow node)
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

  // Modification tracking
  isUserModified: boolean;
  originalTitle?: string;
  originalDescription?: string;
}

// Edge between components
interface DiagramEdge {
  id: string;
  diagramId: string;
  source: string;          // source component ID
  target: string;          // target component ID
  type?: string;
  label?: string;
  animated?: boolean;
}

// Full diagram state (for save/load)
interface DiagramState {
  diagram: {
    id: string;
    name: string;
    operationId: string;
    isModified: boolean;
    lastSavedAt?: string;
  };
  components: DiagramComponent[];
  edges: DiagramEdge[];
  viewport: { x: number; y: number; zoom: number };
}
```

---

### 5. API Specification

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

#### 5.3 Get Diagram (Full State for ReactFlow)

```
GET /api/diagrams/:diagramId

Response:
{
  "diagram": {
    "id": "uuid",
    "name": "Add to Cart Flow",
    "operationId": "uuid",
    "status": "COMPLETED",
    "isModified": false,
    "lastSavedAt": null,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "components": [
    {
      "id": "node-user-action",
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
      "position": { "x": 0, "y": 150 },
      "isUserModified": false
    },
    // ... more components
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-user-action",
      "target": "node-client-code",
      "type": "smoothstep",
      "animated": true
    },
    // ... more edges
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

#### 5.4 Save Diagram (User Modifications)

```
PUT /api/diagrams/:diagramId

Request:
{
  "components": [
    {
      "id": "node-user-action",
      "title": "Click Add to Cart Button",      // User edited
      "description": "Customer adds item to shopping cart",
      "position": { "x": 50, "y": 150 }         // User repositioned
    },
    // ... only include modified components
  ],
  "edges": [
    // ... if edges were modified
  ],
  "viewport": { "x": 100, "y": 50, "zoom": 0.8 }
}

Response:
{
  "success": true,
  "diagram": {
    "id": "uuid",
    "isModified": true,
    "lastSavedAt": "2024-01-15T11:30:00Z"
  }
}
```

#### 5.5 Reset Component to Original

```
POST /api/diagrams/:diagramId/components/:componentId/reset

Response:
{
  "component": {
    "id": "node-user-action",
    "title": "Add to Cart Click",           // Restored to original
    "description": "User clicks the 'Add to Cart' button on product page",
    "isUserModified": false
  }
}
```

#### 5.6 Export Diagram

```
POST /api/diagrams/:diagramId/export

Request:
{
  "format": "png" | "svg" | "json",
  "options": {
    "width": 1920,
    "height": 1080,
    "includeSourceBadges": true,
    "backgroundColor": "#ffffff"
  }
}

Response:
{
  "downloadUrl": "/api/exports/abc123.png",
  "expiresAt": "2024-01-15T11:30:00Z"
}
```

#### 5.7 List Diagrams for Operation

```
GET /api/projects/:projectId/operations/:operationId/diagrams

Response:
{
  "diagrams": [
    {
      "id": "uuid",
      "name": "Add to Cart Flow",
      "status": "COMPLETED",
      "isModified": true,
      "lastSavedAt": "2024-01-15T11:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### 6. Detail Extraction Engine

*(Same as before - LLM-based extraction for each component)*

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

#### 6.2 Master Extraction Prompt

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

---

### 7. ReactFlow Integration

#### 7.1 Why ReactFlow?

| Feature | ReactFlow | Mermaid |
|---------|-----------|---------|
| Interactive editing | ✅ Built-in | ❌ Read-only |
| Drag & drop nodes | ✅ Native | ❌ No |
| Custom node components | ✅ Full React | ⚠️ Limited |
| Zoom & pan | ✅ Built-in | ⚠️ Basic |
| Edge manipulation | ✅ Yes | ❌ No |
| Export to image | ✅ With library | ✅ Built-in |
| Learning curve | Medium | Low |

**Decision:** Use **ReactFlow** for MVP2 to enable interactive editing. Mermaid could be offered as a "simple view" alternative.

#### 7.2 ReactFlow Node Types

```typescript
// Custom node types for our template components
const nodeTypes = {
  userAction: UserActionNode,
  clientCode: ClientCodeNode,
  securityComponent: SecurityComponentNode,
  apiEndpoint: ApiEndpointNode,
  backendLogic: BackendLogicNode,
  database: DatabaseNode,
  eventHandler: EventHandlerNode,
  viewUpdate: ViewUpdateNode,
  securityGroup: SecurityGroupNode,  // Container for security layer
};
```

#### 7.3 Custom Node Component

```tsx
// components/nodes/BaseNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ComponentNodeData {
  title: string;
  description: string;
  details: Record<string, any>;
  status: 'POPULATED' | 'GREYED_OUT' | 'ERROR';
  confidence: number;
  sourceExcerpt?: string;
  isUserModified: boolean;
  onEdit: (id: string) => void;
}

export const BaseNode = memo(({ id, data, selected }: NodeProps<ComponentNodeData>) => {
  const statusColors = {
    POPULATED: '#4CAF50',
    GREYED_OUT: '#9E9E9E',
    ERROR: '#F44336',
  };

  return (
    <div
      className={`component-node ${selected ? 'selected' : ''} ${data.status.toLowerCase()}`}
      style={{
        borderColor: statusColors[data.status],
        opacity: data.status === 'GREYED_OUT' ? 0.6 : 1,
      }}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Left} />

      {/* Header */}
      <div className="node-header">
        <span className="node-title">{data.title}</span>
        {data.isUserModified && <span className="modified-badge">✎</span>}
      </div>

      {/* Description */}
      <div className="node-description">
        {data.description}
      </div>

      {/* Footer */}
      <div className="node-footer">
        {data.status === 'POPULATED' && (
          <span className="confidence">{Math.round(data.confidence * 100)}%</span>
        )}
        {data.sourceExcerpt && (
          <span className="source-badge" title={data.sourceExcerpt}>📎</span>
        )}
        <button className="edit-btn" onClick={() => data.onEdit(id)}>✏️</button>
      </div>

      {/* Output handle */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
```

#### 7.4 Security Layer Group Node

```tsx
// components/nodes/SecurityGroupNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const SecurityGroupNode = memo(({ data }: NodeProps) => {
  return (
    <div className="security-group-node">
      <Handle type="target" position={Position.Left} />

      <div className="group-label">Security Layer</div>

      <div className="security-components">
        {data.components.map((comp: any) => (
          <div
            key={comp.id}
            className={`security-sub-node ${comp.status.toLowerCase()}`}
          >
            <div className="sub-title">{comp.title}</div>
            <div className="sub-desc">{comp.description}</div>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
```

#### 7.5 Main Diagram Editor Component

```tsx
// components/DiagramEditor.tsx
import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeTypes } from './nodes';
import { EditModal } from './EditModal';
import { DiagramToolbar } from './DiagramToolbar';
import { transformToReactFlow, transformFromReactFlow } from '../utils/diagramTransform';

interface DiagramEditorProps {
  diagramId: string;
  initialData: DiagramState;
  onSave: (state: DiagramState) => Promise<void>;
}

export function DiagramEditor({ diagramId, initialData, onSave }: DiagramEditorProps) {
  // Transform API data to ReactFlow format
  const { initialNodes, initialEdges } = transformToReactFlow(initialData);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [viewport, setViewport] = useState(initialData.viewport);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Track changes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    setHasUnsavedChanges(true);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    setHasUnsavedChanges(true);
  }, [onEdgesChange]);

  // Open edit modal
  const handleEditNode = useCallback((nodeId: string) => {
    setEditingNode(nodeId);
  }, []);

  // Save node edits
  const handleSaveNodeEdit = useCallback((nodeId: string, updates: Partial<ComponentNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updates,
              isUserModified: true,
            },
          };
        }
        return node;
      })
    );
    setEditingNode(null);
    setHasUnsavedChanges(true);
  }, [setNodes]);

  // Save diagram
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const state = transformFromReactFlow(diagramId, nodes, edges, viewport);
      await onSave(state);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [diagramId, nodes, edges, viewport, onSave]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="diagram-editor">
      <DiagramToolbar
        onSave={handleSave}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onExport={() => {/* TODO */}}
        onResetAll={() => {/* TODO */}}
      />

      <div className="reactflow-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onMove={(_, viewport) => setViewport(viewport)}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background gap={20} size={1} />
        </ReactFlow>
      </div>

      {editingNode && (
        <EditModal
          node={nodes.find((n) => n.id === editingNode)!}
          onSave={(updates) => handleSaveNodeEdit(editingNode, updates)}
          onCancel={() => setEditingNode(null)}
          onReset={() => {/* TODO: Reset to original */}}
        />
      )}
    </div>
  );
}
```

#### 7.6 Edit Modal Component

```tsx
// components/EditModal.tsx
import { useState } from 'react';
import { Node } from 'reactflow';

interface EditModalProps {
  node: Node;
  onSave: (updates: { title: string; description: string }) => void;
  onCancel: () => void;
  onReset: () => void;
}

export function EditModal({ node, onSave, onCancel, onReset }: EditModalProps) {
  const [title, setTitle] = useState(node.data.title);
  const [description, setDescription] = useState(node.data.description);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Component</h3>

        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {node.data.sourceExcerpt && (
          <div className="source-info">
            <strong>Source:</strong>
            <p>{node.data.sourceExcerpt}</p>
          </div>
        )}

        <div className="modal-actions">
          {node.data.isUserModified && (
            <button className="btn-reset" onClick={onReset}>
              Reset to Original
            </button>
          )}
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={() => onSave({ title, description })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 7.7 Diagram Layout (Initial Positions)

```typescript
// utils/layoutConfig.ts

// Initial positions for the fixed template
export const INITIAL_LAYOUT = {
  // Main request flow (top row)
  USER_ACTION:    { x: 0,    y: 0 },
  CLIENT_CODE:    { x: 250,  y: 0 },

  // Security layer (middle, grouped)
  SECURITY_GROUP: { x: 500,  y: -50 },  // Group container
  FIREWALL:       { x: 520,  y: 20 },   // Inside group
  WAF:            { x: 640,  y: 20 },
  LOAD_BALANCER:  { x: 760,  y: 20 },
  API_GATEWAY:    { x: 880,  y: 20 },

  // Continue main flow
  API_ENDPOINT:   { x: 1050, y: 0 },
  BACKEND_LOGIC:  { x: 1300, y: 0 },
  DATABASE:       { x: 1550, y: 0 },

  // Response flow (bottom row)
  EVENT_HANDLER:  { x: 250,  y: 250 },
  VIEW_UPDATE:    { x: 0,    y: 250 },
};

// Edge definitions (fixed connections)
export const TEMPLATE_EDGES = [
  { source: 'USER_ACTION', target: 'CLIENT_CODE' },
  { source: 'CLIENT_CODE', target: 'SECURITY_GROUP' },
  { source: 'SECURITY_GROUP', target: 'API_ENDPOINT' },
  { source: 'API_ENDPOINT', target: 'BACKEND_LOGIC' },
  { source: 'BACKEND_LOGIC', target: 'DATABASE' },
  { source: 'DATABASE', target: 'BACKEND_LOGIC', type: 'response' },
  { source: 'BACKEND_LOGIC', target: 'API_ENDPOINT', type: 'response' },
  { source: 'API_ENDPOINT', target: 'SECURITY_GROUP', type: 'response' },
  { source: 'SECURITY_GROUP', target: 'EVENT_HANDLER', type: 'response' },
  { source: 'EVENT_HANDLER', target: 'VIEW_UPDATE' },
];
```

---

### 8. Export Functionality

#### 8.1 Export Options

| Format | Use Case | Implementation |
|--------|----------|----------------|
| PNG | Presentations, docs | ReactFlow's `toImage()` or html-to-image |
| SVG | Scalable graphics | ReactFlow's `toSVG()` |
| JSON | Backup, reimport | Direct state serialization |

#### 8.2 Export Implementation

```typescript
// utils/exportDiagram.ts
import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from 'reactflow';

export async function exportToPng(
  flowElement: HTMLElement,
  nodes: Node[],
  options: { width?: number; backgroundColor?: string } = {}
): Promise<string> {
  const { width = 1920, backgroundColor = '#ffffff' } = options;

  const nodesBounds = getNodesBounds(nodes);
  const viewport = getViewportForBounds(
    nodesBounds,
    width,
    width * 0.6,
    0.5,
    2
  );

  return toPng(flowElement, {
    backgroundColor,
    width,
    height: width * 0.6,
    style: {
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
}

export async function exportToSvg(flowElement: HTMLElement): Promise<string> {
  return toSvg(flowElement);
}

export function exportToJson(state: DiagramState): string {
  return JSON.stringify(state, null, 2);
}
```

---

### 9. Mermaid Alternative (Optional Simple View)

For users who prefer a simpler, non-interactive view, offer Mermaid rendering:

```typescript
// utils/generateMermaid.ts

export function generateMermaidDiagram(components: DiagramComponent[]): string {
  const getLabel = (comp: DiagramComponent) =>
    `${comp.title}<br/><small>${comp.description.slice(0, 30)}...</small>`;

  return `
flowchart LR
    subgraph Client
        UA[${getLabel(components.find(c => c.componentType === 'USER_ACTION')!)}]
        CC[${getLabel(components.find(c => c.componentType === 'CLIENT_CODE')!)}]
    end

    subgraph Security Layer
        FW[Firewall]
        WAF[WAF]
        LB[Load Balancer]
        GW[API Gateway]
    end

    subgraph Backend
        API[${getLabel(components.find(c => c.componentType === 'API_ENDPOINT')!)}]
        BL[${getLabel(components.find(c => c.componentType === 'BACKEND_LOGIC')!)}]
        DB[(${getLabel(components.find(c => c.componentType === 'DATABASE')!)})]
    end

    subgraph Response
        EH[${getLabel(components.find(c => c.componentType === 'EVENT_HANDLER')!)}]
        VU[${getLabel(components.find(c => c.componentType === 'VIEW_UPDATE')!)}]
    end

    UA --> CC --> FW --> WAF --> LB --> GW --> API --> BL --> DB
    DB -.-> BL -.-> API -.-> GW -.-> EH --> VU

    classDef populated fill:#4CAF50,color:#fff
    classDef greyedOut fill:#9E9E9E,color:#fff
  `;
}
```

Usage:
```tsx
import mermaid from 'mermaid';

function MermaidView({ components }: { components: DiagramComponent[] }) {
  const diagram = generateMermaidDiagram(components);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
    mermaid.contentLoaded();
  }, [diagram]);

  return (
    <div className="mermaid">
      {diagram}
    </div>
  );
}
```

---

### 10. Frontend Components Structure

```
src/
├── components/
│   ├── ... (MVP1 components)
│   │
│   ├── diagram/
│   │   ├── DiagramEditor.tsx       # Main ReactFlow wrapper
│   │   ├── DiagramToolbar.tsx      # Save, export, reset buttons
│   │   ├── DiagramViewer.tsx       # Full page view
│   │   ├── EditModal.tsx           # Component edit popup
│   │   ├── MermaidView.tsx         # Optional simple view
│   │   │
│   │   ├── nodes/
│   │   │   ├── index.ts            # Node type exports
│   │   │   ├── BaseNode.tsx        # Base node component
│   │   │   ├── UserActionNode.tsx
│   │   │   ├── ClientCodeNode.tsx
│   │   │   ├── SecurityGroupNode.tsx
│   │   │   ├── ApiEndpointNode.tsx
│   │   │   ├── BackendLogicNode.tsx
│   │   │   ├── DatabaseNode.tsx
│   │   │   ├── EventHandlerNode.tsx
│   │   │   └── ViewUpdateNode.tsx
│   │   │
│   │   └── edges/
│   │       ├── RequestEdge.tsx     # Solid arrow for request
│   │       └── ResponseEdge.tsx    # Dashed arrow for response
│   │
│   ├── DiagramGenerateButton.tsx
│   ├── DiagramStatus.tsx
│   └── DiagramExportMenu.tsx
│
├── utils/
│   ├── diagramTransform.ts         # API ↔ ReactFlow conversion
│   ├── layoutConfig.ts             # Initial positions
│   ├── exportDiagram.ts            # Export functions
│   └── generateMermaid.ts          # Mermaid generation
│
└── hooks/
    ├── useDiagram.ts               # Fetch/save diagram
    └── useAutoSave.ts              # Optional auto-save
```

---

### 11. User Flow (Updated)

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
MVP2 Flow:                                   ┌──────────────────────┐
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
┌────────────────────────────────────────────────────────────────────────────────┐
│                        INTERACTIVE DIAGRAM EDITOR                               │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [💾 Save] [↩️ Reset] [📤 Export ▼]                    Unsaved changes: ●       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌─────────┐      ┌─────────┐      ┌──────────────────┐                │   │
│  │   │ Add to  │ ───▶ │ Cart    │ ───▶ │  Security Layer  │ ───▶ ...      │   │
│  │   │ Cart    │      │ Handler │      │  ┌────┐ ┌────┐   │                │   │
│  │   │ Click   │      │         │      │  │ FW │→│WAF │→..│                │   │
│  │   │   ✎     │      │         │      │  └────┘ └────┘   │                │   │
│  │   └─────────┘      └─────────┘      └──────────────────┘                │   │
│  │        │                                                                 │   │
│  │        │  ◀─── Drag to reposition                                        │   │
│  │        │                                                                 │   │
│  │   ┌─────────┐      ┌─────────┐                                          │   │
│  │   │ Badge   │ ◀─── │ onCart  │ ◀── ...                                  │   │
│  │   │ Updates │      │ Updated │                                          │   │
│  │   └─────────┘      └─────────┘                                          │   │
│  │                                                                          │   │
│  │   [MiniMap]              [Zoom: 100%] [Fit View]                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Click node to edit • Drag to reposition • Scroll to zoom • Ctrl+S to save    │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                              ┌──────────────────┐            ┌──────────────────┐
                              │  Click Node      │            │  [Export ▼]      │
                              │  ────────────    │            │  • PNG           │
                              │  Opens edit      │            │  • SVG           │
                              │  modal           │            │  • JSON          │
                              └────────┬─────────┘            └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ ┌──────────────┐ │
                              │ │ Edit Title   │ │
                              │ │ ──────────── │ │
                              │ │ [Add to Cart]│ │
                              │ │              │ │
                              │ │ Description  │ │
                              │ │ ──────────── │ │
                              │ │ [User clicks]│ │
                              │ │              │ │
                              │ │ Source: ...  │ │
                              │ │              │ │
                              │ │[Reset][Save] │ │
                              │ └──────────────┘ │
                              └──────────────────┘
```

---

### 12. Implementation Steps

#### Phase 1: Data Model & API (Day 1-2)
1. Add new database tables (diagrams, diagram_components, diagram_edges)
2. Add modification tracking fields
3. Create diagram CRUD endpoints
4. Create save endpoint for user modifications
5. Implement component reset endpoint

#### Phase 2: Extraction Engine (Day 3-4)
1. Create component-specific prompts
2. Implement full extraction prompt
3. Build extraction service with LLM calls
4. Handle partial/missing data (greyed out components)
5. Store extracted components with initial positions

#### Phase 3: ReactFlow Integration (Day 5-8)
1. Set up ReactFlow with custom node types
2. Implement BaseNode component with edit button
3. Create SecurityGroupNode for security layer
4. Build edge types (request vs response)
5. Implement viewport controls (zoom, pan, minimap)
6. Add drag-to-reposition functionality

#### Phase 4: Editing & Saving (Day 9-11)
1. Implement EditModal component
2. Add save functionality with optimistic updates
3. Track unsaved changes
4. Implement reset to original
5. Add keyboard shortcuts (Ctrl+S)
6. Warn before leaving with unsaved changes

#### Phase 5: Export & Polish (Day 12-14)
1. Implement PNG export using html-to-image
2. Implement SVG export
3. Implement JSON export
4. Add Mermaid simple view option
5. Loading states and error handling
6. Responsive design

#### Phase 6: Integration & Testing (Day 15)
1. Integration with MVP1 operations list
2. End-to-end testing
3. Performance optimization
4. Deploy

---

### 13. Cost Estimation

#### LLM Costs (Claude 3 Haiku)

| Scenario | Est. Input Tokens | Est. Output Tokens | Cost per Diagram |
|----------|-------------------|--------------------|--------------------|
| Small corpus (10 pages) | ~8,000 | ~2,000 | ~$0.005 |
| Medium corpus (50 pages) | ~30,000 | ~2,500 | ~$0.01 |
| Large corpus (200 pages) | ~120,000 | ~3,000 | ~$0.04 |

#### Infrastructure

Same as MVP1 - near zero with free tier hosting.

#### New Dependencies

| Package | Size | Purpose |
|---------|------|---------|
| reactflow | ~150KB | Interactive diagrams |
| html-to-image | ~20KB | PNG/SVG export |
| mermaid (optional) | ~1MB | Simple view |

---

### 14. Success Criteria

The MVP2 is successful if:

1. Diagrams generate in under 90 seconds for typical corpus
2. At least 60% of components have meaningful extracted data
3. Components without data are clearly marked as greyed out
4. **Users can drag nodes to reposition them**
5. **Users can edit component titles and descriptions**
6. **Users can save their modifications and reload them**
7. Source attribution is visible and accurate
8. Export produces clean PNG/SVG files
9. Users can understand the flow at a glance

---

### 15. Limitations (Addressed in Future MVPs)

| Limitation | Future Enhancement |
|------------|-------------------|
| Fixed template only | MVP3: Custom templates |
| Cannot add/remove nodes | MVP3: Full node CRUD |
| No version history | MVP3: Version tracking & diff |
| Single user editing | MVP4: Multi-user collaboration |
| No source navigation | MVP3: Click source to jump to document |

---

*Document Version: 2.0*
*Builds on: MVP1 (Operation Discovery)*
*Major Update: Added ReactFlow integration, editing, and save functionality*
