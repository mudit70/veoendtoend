# Component Design Document
## VeoEndToEnd - Detailed Component Specifications

### 1. Introduction

This document provides detailed design specifications for each component of the VeoEndToEnd system. It covers data models, APIs, workflows, and implementation guidelines for developers.

---

## Part I: Core Domain Components

### 2. Operation Discovery Component

#### 2.1 Overview
The Operation Discovery Component is responsible for analyzing corpus content to identify and catalog client operations and user interactions.

#### 2.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  Operation Discovery Component                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Corpus     │───▶│   Content    │───▶│  Operation   │      │
│  │   Ingester   │    │   Analyzer   │    │  Extractor   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Chunking   │    │    AI/LLM    │    │  Operation   │      │
│  │   Engine     │    │   Connector  │    │   Registry   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3 Data Models

```typescript
interface Operation {
  id: string;                    // UUID
  name: string;                  // Human-readable name
  description: string;           // Brief description
  type: OperationType;           // CLIENT_OPERATION | USER_INTERACTION
  discoveredFrom: SourceReference[];
  status: DiscoveryStatus;       // DISCOVERED | CONFIRMED | REJECTED
  confidence: number;            // 0.0 - 1.0
  userModified: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface SourceReference {
  corpusId: string;
  fileId: string;
  fileName: string;
  location: {
    page?: number;
    section?: string;
    lineStart?: number;
    lineEnd?: number;
    charStart?: number;
    charEnd?: number;
  };
  excerpt: string;               // Relevant text excerpt
  confidence: number;
}

enum OperationType {
  CLIENT_OPERATION = 'CLIENT_OPERATION',
  USER_INTERACTION = 'USER_INTERACTION'
}

enum DiscoveryStatus {
  DISCOVERED = 'DISCOVERED',     // Auto-discovered, pending review
  CONFIRMED = 'CONFIRMED',       // User confirmed
  REJECTED = 'REJECTED',         // User rejected
  MANUAL = 'MANUAL'              // Manually added by user
}
```

#### 2.4 API Specifications

##### Discover Operations
```
POST /api/v1/discovery/operations

Request:
{
  "corpusId": "uuid",
  "aiServiceId": "string",       // Optional: specific AI service to use
  "options": {
    "maxOperations": 100,
    "minConfidence": 0.7,
    "includeInteractions": true,
    "focusAreas": ["authentication", "payment"]  // Optional filters
  }
}

Response:
{
  "jobId": "uuid",
  "status": "PROCESSING",
  "estimatedCompletionTime": "ISO8601"
}
```

##### Get Discovery Results
```
GET /api/v1/discovery/jobs/{jobId}

Response:
{
  "jobId": "uuid",
  "status": "COMPLETED",
  "operations": [Operation],
  "summary": {
    "totalDiscovered": 15,
    "highConfidence": 12,
    "lowConfidence": 3
  }
}
```

##### Update Operation Status
```
PATCH /api/v1/operations/{operationId}

Request:
{
  "status": "CONFIRMED",
  "name": "Modified Name",        // Optional
  "description": "Updated desc"   // Optional
}
```

#### 2.5 Discovery Workflow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Ingest  │────▶│ Chunk   │────▶│ Embed   │────▶│ Store   │
│ Corpus  │     │ Content │     │ Vectors │     │ Index   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                                                     │
     ┌───────────────────────────────────────────────┘
     ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Query   │────▶│ LLM     │────▶│ Parse   │────▶│ Persist │
│ Chunks  │     │ Analyze │     │ Results │     │ Ops     │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
```

#### 2.6 Chunking Strategy

| Content Type | Chunk Size | Overlap | Strategy |
|--------------|------------|---------|----------|
| Documentation | 1000 tokens | 200 tokens | Semantic paragraphs |
| API Specs | 500 tokens | 100 tokens | Endpoint-based |
| Diagrams/Images | N/A | N/A | Vision model description |
| Tables | Full table | N/A | Structure-preserving |

---

### 3. Template Management Component

#### 3.1 Overview
Manages the lifecycle of visualization templates, supporting natural language creation, multi-user editing, and version control.

#### 3.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  Template Management Component                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    NL-to-    │    │  Template    │    │  Template    │      │
│  │   Template   │    │  Renderer    │    │  Repository  │      │
│  │   Converter  │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Rating &   │    │  Collab      │    │  Version     │      │
│  │   Feedback   │    │  Engine      │    │  Control     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3 Data Models

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  status: TemplateStatus;

  // Structure
  components: TemplateComponent[];
  connections: Connection[];
  layout: LayoutConfiguration;

  // Metadata
  metadataSchema: MetadataField[];
  discoveryGuidelines: DiscoveryGuideline[];

  // Origin
  baseTemplateId?: string;       // If derived from another template
  industryType?: string;
  operationType?: string;

  // Learning
  promptHistory: PromptRecord[];
  ratings: Rating[];

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateComponent {
  id: string;
  type: ComponentType;
  name: string;
  description: string;

  // Visual properties
  defaultPosition: Position;
  defaultSize: Size;
  style: ComponentStyle;

  // Behavior
  isRequired: boolean;
  allowsPassThrough: boolean;    // Can be greyed out

  // Metadata
  metadataFields: string[];      // Reference to MetadataField IDs
}

interface MetadataField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'enum' | 'url' | 'reference';
  displayStyle: 'inline' | 'tooltip' | 'badge' | 'sidebar';
  required: boolean;
  enumValues?: string[];
}

interface DiscoveryGuideline {
  metadataFieldId: string;
  searchPatterns: string[];      // Regex or semantic patterns
  promptHints: string[];         // Hints for LLM
  exampleValues: string[];
  fallbackValue?: string;
}

interface PromptRecord {
  id: string;
  prompt: string;
  resultTemplateId: string;
  rating?: number;
  feedback?: string;
  timestamp: Date;
}

interface Rating {
  userId: string;
  score: number;                 // 1-5
  feedback?: string;
  timestamp: Date;
}

enum ComponentType {
  START = 'START',
  END = 'END',
  PROCESS = 'PROCESS',
  DECISION = 'DECISION',
  DATA_STORE = 'DATA_STORE',
  EXTERNAL_SYSTEM = 'EXTERNAL_SYSTEM',
  USER_ACTION = 'USER_ACTION',
  API_CALL = 'API_CALL',
  EVENT = 'EVENT',
  SUBPROCESS = 'SUBPROCESS'
}
```

#### 3.4 API Specifications

##### Create Template from Natural Language
```
POST /api/v1/templates/generate

Request:
{
  "description": "A template for e-commerce checkout flow with payment processing, inventory check, and order confirmation steps",
  "industryType": "e-commerce",
  "aiServiceId": "claude-3-opus"
}

Response:
{
  "templateId": "uuid",
  "template": Template,
  "generationMetadata": {
    "promptUsed": "string",
    "tokensUsed": 1500,
    "generationTimeMs": 3200
  }
}
```

##### Update Template via Natural Language
```
POST /api/v1/templates/{templateId}/modify

Request:
{
  "instruction": "Add a fraud detection step between payment and order confirmation",
  "aiServiceId": "claude-3-opus"
}

Response:
{
  "template": Template,
  "changes": [
    {
      "type": "COMPONENT_ADDED",
      "componentId": "uuid",
      "details": { ... }
    }
  ]
}
```

##### Rate Template
```
POST /api/v1/templates/{templateId}/ratings

Request:
{
  "score": 4,
  "feedback": "Good structure but missing error handling paths"
}
```

##### Get Best Practice Templates
```
GET /api/v1/templates/recommended?industry={industry}&operationType={type}

Response:
{
  "templates": [
    {
      "template": Template,
      "matchScore": 0.95,
      "usageCount": 150,
      "averageRating": 4.5
    }
  ]
}
```

#### 3.5 Natural Language Processing Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   Intent    │────▶│  Component  │
│   Prompt    │     │   Parser    │     │  Mapper     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
     ┌────────────────────────────────────────┘
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Layout     │────▶│  Style      │────▶│  Template   │
│  Generator  │     │  Applier    │     │  Output     │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

### 4. Diagram Generation Component

#### 4.1 Overview
Generates visual diagrams by combining templates with discovered data, handling component states and source attribution.

#### 4.2 Data Models

```typescript
interface Diagram {
  id: string;
  name: string;
  operationId: string;
  templateId: string;
  templateVersion: number;
  corpusId: string;

  // Content
  components: DiagramComponent[];
  connections: DiagramConnection[];

  // State
  status: DiagramStatus;
  version: number;
  generationHistory: GenerationRecord[];

  // Audit
  createdBy: string;
  createdAt: Date;
  modifiedBy: string;
  modifiedAt: Date;
}

interface DiagramComponent {
  id: string;
  templateComponentId: string;

  // Visual state
  status: ComponentStatus;
  position: Position;
  size: Size;
  customStyle?: ComponentStyle;

  // Content
  label: string;
  description: string;
  metadata: Record<string, any>;

  // Attribution
  sourceReferences: SourceReference[];
  confidenceScore: number;

  // User modifications
  isModified: boolean;
  originalContent?: {
    label: string;
    description: string;
    metadata: Record<string, any>;
  };
}

interface DiagramConnection {
  id: string;
  sourceComponentId: string;
  targetComponentId: string;
  label?: string;
  type: 'flow' | 'data' | 'conditional';
  condition?: string;
}

interface GenerationRecord {
  id: string;
  version: number;
  generatedAt: Date;
  generatedBy: string;
  aiServiceUsed: string;
  tokensUsed: number;
  processingTimeMs: number;
  corpusVersion: string;
}

enum ComponentStatus {
  ACTIVE = 'ACTIVE',             // Fully populated with data
  GREYED_OUT = 'GREYED_OUT',     // No data found, pass-through
  ERROR = 'ERROR',               // Discovery failed
  PENDING = 'PENDING'            // Awaiting discovery
}

enum DiagramStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  VALIDATED = 'VALIDATED',
  PUBLISHED = 'PUBLISHED'
}
```

#### 4.3 API Specifications

##### Generate Diagram
```
POST /api/v1/diagrams/generate

Request:
{
  "operationId": "uuid",
  "templateId": "uuid",
  "corpusId": "uuid",
  "options": {
    "aiServiceIds": ["claude-3-opus", "gpt-4"],  // Use multiple
    "includeSourceReferences": true,
    "metadataFields": ["owner", "sla", "api_endpoint"]
  }
}

Response:
{
  "diagramId": "uuid",
  "diagram": Diagram,
  "generationSummary": {
    "componentsPopulated": 8,
    "componentsGreyedOut": 2,
    "averageConfidence": 0.85,
    "sourcesUsed": 15
  }
}
```

##### Update Diagram
```
PATCH /api/v1/diagrams/{diagramId}

Request:
{
  "modifications": [
    {
      "componentId": "uuid",
      "changes": {
        "label": "New Label",
        "metadata": { "owner": "Team A" }
      }
    }
  ]
}
```

##### Regenerate Diagram
```
POST /api/v1/diagrams/{diagramId}/regenerate

Request:
{
  "preserveModifications": true,  // Keep user edits
  "forceRefresh": false           // Use cached discovery if available
}

Response:
{
  "diagram": Diagram,
  "changes": [
    {
      "componentId": "uuid",
      "changeType": "CONTENT_UPDATED",
      "previousValue": { ... },
      "newValue": { ... }
    }
  ]
}
```

##### Export Diagram
```
POST /api/v1/diagrams/{diagramId}/export

Request:
{
  "format": "svg" | "png" | "pdf" | "json" | "mermaid",
  "options": {
    "includeMetadata": true,
    "includeSourceReferences": true,
    "resolution": "high"
  }
}

Response:
{
  "downloadUrl": "string",
  "expiresAt": "ISO8601"
}
```

#### 4.4 Generation Workflow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Diagram Generation Workflow                       │
└──────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ Load    │────▶│ Initialize  │────▶│ For Each    │────▶│ Query       │
  │ Template│     │ Diagram     │     │ Component   │     │ Corpus      │
  └─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                │
       ┌────────────────────────────────────────────────────────┘
       ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ LLM         │────▶│ Parse &     │────▶│ Apply       │
  │ Discovery   │     │ Validate    │     │ Status      │
  └─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       │    ┌───────────────────────────────────┘
       │    ▼
       │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │  │ Attach      │────▶│ Calculate   │────▶│ Render      │
       │  │ Sources     │     │ Layout      │     │ Diagram     │
       │  └─────────────┘     └─────────────┘     └─────────────┘
       │                                                │
       └───────── Loop for all components ──────────────┘
```

#### 4.5 Source Attribution Display

```
┌─────────────────────────────────────────┐
│  Payment Processing                     │
│  ┌───────────────────────────────────┐  │
│  │  Process credit card payment      │  │
│  │  via Stripe API                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  📎 Sources (3)                         │
│  ├─ api-docs.md:245-260                │
│  ├─ payment-flow.pdf:12                │
│  └─ architecture.md:89                 │
│                                         │
│  Confidence: 92%  ⬤⬤⬤⬤⬤⬤⬤⬤⬤○          │
└─────────────────────────────────────────┘
```

---

### 5. Validation Component

#### 5.1 Overview
Validates diagrams against the source corpus to identify discrepancies and ensure accuracy.

#### 5.2 Data Models

```typescript
interface ValidationReport {
  id: string;
  diagramId: string;
  diagramVersion: number;
  corpusId: string;
  corpusVersion: string;

  validatedAt: Date;
  validatedBy: string;

  status: ValidationStatus;
  score: number;                 // 0-100

  discrepancies: Discrepancy[];
  warnings: Warning[];

  summary: ValidationSummary;
}

interface Discrepancy {
  id: string;
  componentId: string;
  type: DiscrepancyType;
  severity: 'critical' | 'major' | 'minor';

  diagramValue: string;
  corpusValue: string;
  sourceReference: SourceReference;

  suggestedFix?: string;
  autoFixable: boolean;
}

interface Warning {
  id: string;
  componentId?: string;
  type: WarningType;
  message: string;
  sourceReference?: SourceReference;
}

interface ValidationSummary {
  totalComponents: number;
  validatedComponents: number;
  componentsWithDiscrepancies: number;
  componentsNotInCorpus: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
}

enum DiscrepancyType {
  VALUE_MISMATCH = 'VALUE_MISMATCH',
  MISSING_IN_CORPUS = 'MISSING_IN_CORPUS',
  OUTDATED_INFO = 'OUTDATED_INFO',
  CONFLICTING_SOURCES = 'CONFLICTING_SOURCES'
}

enum WarningType {
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  SINGLE_SOURCE = 'SINGLE_SOURCE',
  STALE_SOURCE = 'STALE_SOURCE',
  AMBIGUOUS_INFO = 'AMBIGUOUS_INFO'
}

enum ValidationStatus {
  PASSED = 'PASSED',
  PASSED_WITH_WARNINGS = 'PASSED_WITH_WARNINGS',
  FAILED = 'FAILED'
}
```

#### 5.3 API Specifications

##### Validate Diagram
```
POST /api/v1/diagrams/{diagramId}/validate

Request:
{
  "corpusId": "uuid",
  "options": {
    "strictMode": false,
    "validateMetadata": true,
    "aiServiceId": "claude-3-opus"
  }
}

Response:
{
  "reportId": "uuid",
  "report": ValidationReport
}
```

##### Get Validation History
```
GET /api/v1/diagrams/{diagramId}/validations

Response:
{
  "validations": [
    {
      "reportId": "uuid",
      "validatedAt": "ISO8601",
      "status": "PASSED",
      "score": 95
    }
  ]
}
```

##### Apply Auto-fixes
```
POST /api/v1/diagrams/{diagramId}/validations/{reportId}/apply-fixes

Request:
{
  "discrepancyIds": ["uuid1", "uuid2"],
  "applyAll": false
}

Response:
{
  "appliedFixes": 2,
  "diagram": Diagram
}
```

#### 5.4 Validation Workflow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Load    │────▶│ For Each    │────▶│ Search      │────▶│ Compare     │
│ Diagram │     │ Component   │     │ Corpus      │     │ Values      │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                      │                                       │
                      │    ┌──────────────────────────────────┘
                      │    ▼
                      │  ┌─────────────┐     ┌─────────────┐
                      │  │ Identify    │────▶│ Generate    │
                      │  │ Discrepancy │     │ Suggestion  │
                      │  └─────────────┘     └─────────────┘
                      │                            │
                      └───── Loop ─────────────────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │ Create      │
                                            │ Report      │
                                            └─────────────┘
```

---

### 6. Version Control Component

#### 6.1 Overview
Tracks the history of diagram generations, enables comparison between versions, and supports rollback operations.

#### 6.2 Data Models

```typescript
interface DiagramVersion {
  id: string;
  diagramId: string;
  version: number;

  // Snapshot
  snapshot: DiagramSnapshot;

  // Diff from previous
  changes: Change[];
  changeSummary: string;

  // Context
  triggeredBy: 'GENERATION' | 'USER_EDIT' | 'REGENERATION' | 'VALIDATION_FIX';
  createdBy: string;
  createdAt: Date;

  // Discovery context
  corpusVersion?: string;
  aiServiceUsed?: string;
}

interface DiagramSnapshot {
  components: DiagramComponent[];
  connections: DiagramConnection[];
  metadata: Record<string, any>;
}

interface Change {
  id: string;
  path: string;                  // JSON path to changed field
  type: 'added' | 'removed' | 'modified';
  previousValue?: any;
  newValue?: any;
  componentId?: string;
}

interface VersionDiff {
  fromVersion: number;
  toVersion: number;

  addedComponents: DiagramComponent[];
  removedComponents: DiagramComponent[];
  modifiedComponents: ComponentDiff[];

  addedConnections: DiagramConnection[];
  removedConnections: DiagramConnection[];

  visualDiff?: string;           // Base64 encoded diff image
}

interface ComponentDiff {
  componentId: string;
  changes: Change[];
}
```

#### 6.3 API Specifications

##### Get Version History
```
GET /api/v1/diagrams/{diagramId}/versions

Query params:
- limit: number
- offset: number

Response:
{
  "versions": [DiagramVersion],
  "total": number
}
```

##### Get Version Diff
```
GET /api/v1/diagrams/{diagramId}/versions/diff?from={v1}&to={v2}

Response:
{
  "diff": VersionDiff
}
```

##### Restore Version
```
POST /api/v1/diagrams/{diagramId}/versions/{versionNumber}/restore

Response:
{
  "diagram": Diagram,
  "newVersion": number
}
```

#### 6.4 Visual Diff Display

```
Version 3 → Version 4 Diff

┌─────────────────┐        ┌─────────────────┐
│ 🟢 Added        │        │ 🔴 Removed      │
│ Fraud Check     │        │ Manual Review   │
└─────────────────┘        └─────────────────┘

┌─────────────────────────────────────────────┐
│ 🟡 Modified: Payment Processing             │
│ ─────────────────────────────────────────── │
│ - via PayPal API                            │
│ + via Stripe API                            │
│                                             │
│ Metadata changed:                           │
│   owner: "Finance" → "Payments Team"        │
└─────────────────────────────────────────────┘
```

---

## Part II: Infrastructure Components

### 7. AI Service Orchestrator

#### 7.1 Overview
Provides a unified interface for interacting with multiple LLM providers, handling load balancing, failover, and cost optimization.

#### 7.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Service Orchestrator                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Request    │───▶│   Provider   │───▶│   Response   │      │
│  │   Router     │    │   Selector   │    │   Handler    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Prompt     │    │   Provider   │    │   Quality    │      │
│  │   Builder    │    │   Adapters   │    │   Monitor    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.3 Data Models

```typescript
interface AIServiceConfig {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;

  // Connection
  endpoint: string;
  apiKeyRef: string;             // Reference to secret store

  // Limits
  maxTokens: number;
  rateLimit: number;             // Requests per minute

  // Capabilities
  supportedTasks: AITask[];
  contextWindow: number;

  // Cost
  costPerInputToken: number;
  costPerOutputToken: number;

  // Status
  isActive: boolean;
  healthStatus: 'healthy' | 'degraded' | 'unavailable';
  lastHealthCheck: Date;
}

interface AIRequest {
  id: string;
  task: AITask;
  prompt: string;
  context?: string;

  // Preferences
  preferredServices?: string[];
  maxCost?: number;
  maxLatencyMs?: number;
  minQualityScore?: number;

  // Metadata
  requestedBy: string;
  requestedAt: Date;
}

interface AIResponse {
  requestId: string;
  serviceId: string;

  content: string;
  parsedContent?: any;           // Structured output if applicable

  // Metrics
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cost: number;

  // Quality
  qualityScore?: number;
}

enum AIProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  AZURE_OPENAI = 'AZURE_OPENAI',
  CUSTOM = 'CUSTOM'
}

enum AITask {
  OPERATION_DISCOVERY = 'OPERATION_DISCOVERY',
  DETAIL_EXTRACTION = 'DETAIL_EXTRACTION',
  TEMPLATE_GENERATION = 'TEMPLATE_GENERATION',
  TEMPLATE_MODIFICATION = 'TEMPLATE_MODIFICATION',
  VALIDATION = 'VALIDATION',
  SUMMARIZATION = 'SUMMARIZATION'
}
```

#### 7.4 API Specifications

##### Execute AI Request
```
POST /api/v1/ai/execute

Request:
{
  "task": "DETAIL_EXTRACTION",
  "prompt": "Extract payment processing details...",
  "context": "...",
  "options": {
    "preferredServices": ["claude-3-opus"],
    "maxCost": 0.10,
    "structured": true,
    "schema": { ... }
  }
}

Response:
{
  "requestId": "uuid",
  "response": AIResponse
}
```

##### Get Available Services
```
GET /api/v1/ai/services

Response:
{
  "services": [
    {
      "id": "claude-3-opus",
      "name": "Claude 3 Opus",
      "provider": "ANTHROPIC",
      "status": "healthy",
      "capabilities": ["OPERATION_DISCOVERY", "TEMPLATE_GENERATION"],
      "costTier": "premium"
    }
  ]
}
```

#### 7.5 Provider Selection Algorithm

```
function selectProvider(request: AIRequest): AIServiceConfig {
  const eligibleServices = services.filter(s =>
    s.isActive &&
    s.healthStatus === 'healthy' &&
    s.supportedTasks.includes(request.task)
  );

  // Apply user preferences
  if (request.preferredServices?.length) {
    const preferred = eligibleServices.filter(s =>
      request.preferredServices.includes(s.id)
    );
    if (preferred.length) return selectOptimal(preferred, request);
  }

  // Cost optimization
  if (request.maxCost) {
    const withinBudget = eligibleServices.filter(s =>
      estimateCost(s, request) <= request.maxCost
    );
    return selectOptimal(withinBudget, request);
  }

  // Default: balance quality and cost
  return selectOptimal(eligibleServices, request);
}

function selectOptimal(services, request) {
  return services.sort((a, b) => {
    const scoreA = calculateScore(a, request);
    const scoreB = calculateScore(b, request);
    return scoreB - scoreA;
  })[0];
}
```

---

### 8. Collaboration Engine

#### 8.1 Overview
Enables real-time multi-user editing of templates and diagrams using Conflict-free Replicated Data Types (CRDTs).

#### 8.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Collaboration Engine                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  WebSocket   │    │   Session    │    │   Presence   │      │
│  │  Server      │    │   Manager    │    │   Tracker    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   CRDT       │    │   Conflict   │    │   Sync       │      │
│  │   Engine     │    │   Resolver   │    │   Manager    │      │
│  │   (Y.js)     │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 8.3 Data Models

```typescript
interface CollaborationSession {
  id: string;
  documentId: string;
  documentType: 'template' | 'diagram';

  participants: Participant[];

  createdAt: Date;
  lastActivity: Date;
}

interface Participant {
  userId: string;
  displayName: string;
  color: string;                 // For cursor/selection highlighting

  cursor?: CursorPosition;
  selection?: SelectionRange;

  joinedAt: Date;
  lastSeen: Date;
  status: 'active' | 'idle' | 'disconnected';
}

interface CursorPosition {
  componentId?: string;
  x: number;
  y: number;
}

interface CollaborationEvent {
  type: 'join' | 'leave' | 'update' | 'cursor' | 'selection';
  sessionId: string;
  userId: string;
  timestamp: Date;
  payload: any;
}
```

#### 8.4 WebSocket Protocol

```
// Client → Server
{
  "type": "join",
  "documentId": "uuid",
  "documentType": "template"
}

{
  "type": "update",
  "operations": [
    { "type": "insert", "path": ["components", 0], "value": {...} }
  ]
}

{
  "type": "cursor",
  "position": { "componentId": "uuid", "x": 100, "y": 200 }
}

// Server → Client
{
  "type": "sync",
  "document": {...},
  "version": 42
}

{
  "type": "presence",
  "participants": [...]
}

{
  "type": "remote-update",
  "userId": "uuid",
  "operations": [...]
}
```

---

### 9. Corpus Service

#### 9.1 Overview
Manages document ingestion, indexing, and semantic search capabilities for the knowledge corpus.

#### 9.2 Data Models

```typescript
interface Corpus {
  id: string;
  name: string;
  description: string;

  // Stats
  documentCount: number;
  totalChunks: number;
  totalTokens: number;

  // Configuration
  chunkingConfig: ChunkingConfig;
  embeddingModel: string;

  // Status
  status: 'processing' | 'ready' | 'error';
  lastUpdated: Date;

  // Access
  ownerId: string;
  sharedWith: string[];
}

interface CorpusDocument {
  id: string;
  corpusId: string;

  // Content
  fileName: string;
  fileType: string;
  content: string;

  // Chunks
  chunks: Chunk[];

  // Metadata
  uploadedAt: Date;
  processedAt: Date;
  version: string;
}

interface Chunk {
  id: string;
  documentId: string;

  content: string;
  embedding: number[];           // Vector embedding

  // Position
  startChar: number;
  endChar: number;
  pageNumber?: number;
  section?: string;

  // Metadata
  tokenCount: number;
}

interface SearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;

  content: string;
  excerpt: string;

  score: number;                 // Similarity score

  location: {
    page?: number;
    section?: string;
    line?: number;
  };
}

interface ChunkingConfig {
  strategy: 'fixed' | 'semantic' | 'hierarchical';
  chunkSize: number;
  overlap: number;
  preserveStructure: boolean;
}
```

#### 9.3 API Specifications

##### Create/Update Corpus
```
POST /api/v1/corpus

Request (multipart/form-data):
- files: File[]
- name: string
- description: string
- chunkingConfig: ChunkingConfig

Response:
{
  "corpusId": "uuid",
  "status": "processing",
  "jobId": "uuid"
}
```

##### Search Corpus
```
POST /api/v1/corpus/{corpusId}/search

Request:
{
  "query": "payment processing API endpoint",
  "limit": 10,
  "threshold": 0.7,
  "filters": {
    "documentIds": ["uuid1", "uuid2"],
    "fileTypes": ["md", "pdf"]
  }
}

Response:
{
  "results": [SearchResult],
  "totalMatches": 25
}
```

#### 9.4 Ingestion Pipeline

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Upload  │────▶│ Extract     │────▶│ Chunk       │────▶│ Embed       │
│ Files   │     │ Text        │     │ Content     │     │ Vectors     │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                      │                   │                   │
                      ▼                   ▼                   ▼
               ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
               │ PDF Parser  │     │ Semantic    │     │ OpenAI      │
               │ MD Parser   │     │ Splitter    │     │ Embeddings  │
               │ DOCX Parser │     │             │     │             │
               └─────────────┘     └─────────────┘     └─────────────┘
                                                             │
                                                             ▼
                                                       ┌─────────────┐
                                                       │ Vector DB   │
                                                       │ (Pinecone)  │
                                                       └─────────────┘
```

---

## Part III: UI Components

### 10. Diagram Canvas Component

#### 10.1 Features
- Infinite canvas with pan and zoom
- Component drag and drop
- Connection drawing
- Multi-select and group operations
- Undo/redo stack
- Keyboard shortcuts
- Touch support

#### 10.2 Component State Machine

```
                    ┌─────────┐
                    │  Idle   │
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │Selecting│    │ Dragging │    │ Drawing  │
    └────┬────┘    └────┬─────┘    │Connection│
         │              │          └────┬─────┘
         ▼              ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │ Editing │    │ Dropped  │    │Connected │
    └─────────┘    └──────────┘    └──────────┘
```

#### 10.3 Rendering Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Canvas Container                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: UI Overlay (cursors, selection, tooltips)         │
│  Layer 4: Annotations (comments, markers)                   │
│  Layer 3: Connections (arrows, lines)                       │
│  Layer 2: Components (process boxes, decisions)             │
│  Layer 1: Grid/Background                                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 11. Source Attribution Overlay

#### 11.1 Features
- Hover to show source references
- Click to navigate to source
- Confidence indicator visualization
- Multi-source comparison view

#### 11.2 Display States

```
┌────────────────────────────────────────┐
│ Component: Payment Gateway             │
├────────────────────────────────────────┤
│                                        │
│ 📄 Sources                             │
│ ┌────────────────────────────────────┐ │
│ │ 🟢 api-docs.md (95% match)         │ │
│ │    Line 245-260                    │ │
│ │    "The payment gateway handles..."│ │
│ ├────────────────────────────────────┤ │
│ │ 🟡 architecture.pdf (78% match)    │ │
│ │    Page 12, Section 3.2            │ │
│ │    "Payment processing occurs..."  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Overall Confidence: 87%                │
│ [View in Corpus] [Revalidate]          │
└────────────────────────────────────────┘
```

---

## Part IV: Implementation Guidelines

### 12. Error Handling Strategy

#### 12.1 Error Categories

| Category | Handling | User Communication |
|----------|----------|-------------------|
| AI Service Failure | Retry with fallback provider | "Processing with alternate service..." |
| Corpus Not Found | Block operation | "Source corpus not available" |
| Validation Conflict | Show diff dialog | "Discrepancy found - review needed" |
| Collaboration Conflict | Auto-merge with CRDT | Silent resolution |
| Rate Limit | Queue and retry | "Request queued, processing shortly" |

#### 12.2 Retry Configuration

```typescript
const retryConfig = {
  aiService: {
    maxRetries: 3,
    backoffMs: [1000, 2000, 4000],
    fallbackEnabled: true
  },
  database: {
    maxRetries: 5,
    backoffMs: [100, 200, 400, 800, 1600],
    fallbackEnabled: false
  },
  collaboration: {
    maxRetries: 10,
    backoffMs: [50, 100, 200, 400, 800],
    fallbackEnabled: false
  }
};
```

### 13. Performance Targets

| Operation | Target Latency | Notes |
|-----------|---------------|-------|
| Diagram Load | < 500ms | With caching |
| Component Render | < 16ms | 60fps target |
| Discovery (single) | < 30s | Depends on corpus size |
| Validation | < 15s | Per diagram |
| Search | < 200ms | Vector similarity |
| Collaboration Sync | < 100ms | P95 |

### 14. Testing Strategy

#### 14.1 Test Categories

| Type | Coverage Target | Tools |
|------|----------------|-------|
| Unit Tests | 80% | Jest, Vitest |
| Integration Tests | Key flows | Playwright, Cypress |
| E2E Tests | Critical paths | Playwright |
| Load Tests | Collaboration | k6, Artillery |
| AI Response Tests | Quality gates | Custom harness |

#### 14.2 AI Testing Approach

```typescript
// Example: Testing operation discovery quality
describe('Operation Discovery', () => {
  it('should identify core operations with high confidence', async () => {
    const corpus = loadTestCorpus('e-commerce');
    const result = await discoveryService.discoverOperations(corpus.id);

    expect(result.operations).toContainOperation('checkout');
    expect(result.operations).toContainOperation('payment');
    expect(result.averageConfidence).toBeGreaterThan(0.8);
  });
});
```

---

## Appendix A: API Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/discovery/operations` | POST | Start operation discovery |
| `/api/v1/discovery/jobs/{id}` | GET | Get discovery job status |
| `/api/v1/operations/{id}` | PATCH | Update operation |
| `/api/v1/templates` | POST | Create template |
| `/api/v1/templates/generate` | POST | Generate from NL |
| `/api/v1/templates/{id}` | GET/PUT/DELETE | Template CRUD |
| `/api/v1/templates/{id}/modify` | POST | NL modification |
| `/api/v1/templates/{id}/ratings` | POST | Rate template |
| `/api/v1/diagrams/generate` | POST | Generate diagram |
| `/api/v1/diagrams/{id}` | GET/PATCH/DELETE | Diagram CRUD |
| `/api/v1/diagrams/{id}/regenerate` | POST | Regenerate |
| `/api/v1/diagrams/{id}/export` | POST | Export diagram |
| `/api/v1/diagrams/{id}/validate` | POST | Validate |
| `/api/v1/diagrams/{id}/versions` | GET | Version history |
| `/api/v1/corpus` | POST | Create corpus |
| `/api/v1/corpus/{id}/search` | POST | Search corpus |
| `/api/v1/ai/execute` | POST | Execute AI request |
| `/api/v1/ai/services` | GET | List AI services |

---

## Appendix B: Event Catalog

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `operation.discovered` | Discovery Service | Notification, Analytics | Operation[] |
| `diagram.generated` | Diagram Service | Version Control, Cache | Diagram |
| `diagram.validated` | Validation Service | Notification | ValidationReport |
| `template.updated` | Template Service | Cache Invalidator | Template |
| `corpus.updated` | Corpus Service | Discovery Service | Corpus |
| `collaboration.joined` | Collab Engine | Presence Tracker | Participant |

---

*Document Version: 1.0*
*Last Updated: 2024*
