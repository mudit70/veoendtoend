# MVP3: Diagram Validation
## VeoEndToEnd - Minimum Viable Product Phase 3

### 1. MVP3 Goal

Build on MVP1 (Operation Discovery) and MVP2 (Diagram Rendering & Editing) by adding the ability to **validate diagrams against the source corpus** to identify discrepancies and ensure accuracy.

**Prerequisites from MVP1:**
- Document upload and text extraction
- LLM-based operation discovery
- Operations list with user corrections

**Prerequisites from MVP2:**
- Interactive diagram rendering using ReactFlow
- User can modify diagram components
- Save/load diagram modifications

**What's NEW in MVP3:**
- **Validate diagram against source corpus**
- **Identify discrepancies between diagram and documents**
- **Visual indicators for validation status on components**
- **Detailed validation report with suggested fixes**
- **Re-validate after corpus updates**

**What's OUT of scope for MVP3:**
- Auto-fix discrepancies (user must manually fix)
- Continuous/real-time validation
- Validation rules customization
- Multi-corpus validation

---

### 2. Validation Concept

#### 2.1 What Gets Validated?

For each diagram component, the system checks:

| Check Type | Description | Example |
|------------|-------------|---------|
| **Content Accuracy** | Does the component content match the corpus? | API endpoint path matches documentation |
| **Existence** | Is the component still referenced in the corpus? | The described service still exists |
| **Consistency** | Are there conflicting statements in the corpus? | Multiple docs describe different behaviors |
| **Completeness** | Is there new info in corpus not in diagram? | New fields added to API response |
| **Staleness** | Has source document been updated since diagram creation? | Doc modified after diagram was generated |

#### 2.2 Validation States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPONENT VALIDATION STATES                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ VALID              Component matches corpus, no issues found             │
│                                                                              │
│  ⚠️ WARNING            Minor discrepancy or low confidence match            │
│                                                                              │
│  ❌ INVALID            Significant discrepancy with corpus                   │
│                                                                              │
│  ❓ UNVERIFIABLE       Cannot find relevant info in corpus to validate      │
│                                                                              │
│  🔄 STALE              Source document updated after diagram creation        │
│                                                                              │
│  ⚪ NOT_VALIDATED      Validation not yet run                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.3 Validation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │────▶│   Load       │────▶│  For Each    │────▶│   Query      │
│   Triggers   │     │   Diagram    │     │  Component   │     │   Corpus     │
│  Validation  │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
       ┌──────────────────────────────────────────────────────────────┘
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    LLM       │────▶│   Compare    │────▶│   Determine  │────▶│   Generate   │
│   Extract    │     │   Content    │     │   Status     │     │   Report     │
│   Current    │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

### 3. Architecture (Building on MVP2)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  MVP1 & 2   │  │   Validation    │  │   Validation        │  │
│  │  Components │  │   Trigger       │  │   Report View       │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Node.js)                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  MVP1 & 2   │  │   Validation    │  │   Comparison        │  │
│  │  Endpoints  │  │   Engine        │  │   Service           │  │
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
-- Extends MVP1 & MVP2 schema

-- Validation runs for diagrams
CREATE TABLE validation_runs (
    id TEXT PRIMARY KEY,
    diagram_id TEXT REFERENCES diagrams(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id),

    -- Status
    status TEXT DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),

    -- Results summary
    total_components INTEGER,
    valid_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    unverifiable_count INTEGER DEFAULT 0,
    stale_count INTEGER DEFAULT 0,

    -- Overall score (0-100)
    validation_score REAL,

    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Error tracking
    error_message TEXT
);

-- Validation results per component
CREATE TABLE validation_results (
    id TEXT PRIMARY KEY,
    validation_run_id TEXT REFERENCES validation_runs(id) ON DELETE CASCADE,
    component_id TEXT REFERENCES diagram_components(id),

    -- Validation outcome
    status TEXT NOT NULL
        CHECK(status IN ('VALID', 'WARNING', 'INVALID', 'UNVERIFIABLE', 'STALE')),

    -- What was validated
    diagram_content JSON,           -- Content from diagram at validation time
    corpus_content JSON,            -- Content found in corpus

    -- Discrepancy details
    discrepancies JSON,             -- Array of discrepancy objects

    -- LLM analysis
    analysis_summary TEXT,          -- Human-readable summary
    confidence REAL,                -- Confidence in validation result

    -- Source references
    source_references JSON,         -- Documents/locations checked

    -- Suggestions
    suggested_fix TEXT,             -- What should be changed

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track document modifications for staleness detection
CREATE TABLE document_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,     -- Hash of document content
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster staleness checks
CREATE INDEX idx_doc_versions_doc_id ON document_versions(document_id);
CREATE INDEX idx_validation_runs_diagram ON validation_runs(diagram_id);
```

#### 4.2 TypeScript Types

```typescript
// Validation status enum
enum ValidationStatus {
  VALID = 'VALID',
  WARNING = 'WARNING',
  INVALID = 'INVALID',
  UNVERIFIABLE = 'UNVERIFIABLE',
  STALE = 'STALE',
  NOT_VALIDATED = 'NOT_VALIDATED'
}

// Discrepancy types
enum DiscrepancyType {
  CONTENT_MISMATCH = 'CONTENT_MISMATCH',       // Diagram says X, corpus says Y
  MISSING_IN_CORPUS = 'MISSING_IN_CORPUS',     // Diagram has info not in corpus
  MISSING_IN_DIAGRAM = 'MISSING_IN_DIAGRAM',   // Corpus has info not in diagram
  OUTDATED = 'OUTDATED',                        // Info has changed
  CONFLICTING_SOURCES = 'CONFLICTING_SOURCES', // Multiple docs disagree
  PARTIAL_MATCH = 'PARTIAL_MATCH'              // Some parts match, some don't
}

// Severity levels
enum DiscrepancySeverity {
  CRITICAL = 'CRITICAL',   // Major factual error
  MAJOR = 'MAJOR',         // Significant discrepancy
  MINOR = 'MINOR',         // Small difference
  INFO = 'INFO'            // FYI, not necessarily wrong
}

// Discrepancy detail
interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  field: string;                    // Which field has the issue
  diagramValue: string;             // What the diagram says
  corpusValue: string;              // What the corpus says
  explanation: string;              // Human-readable explanation
  sourceReference: SourceReference;
}

// Validation result for a component
interface ComponentValidationResult {
  id: string;
  componentId: string;
  componentType: string;
  status: ValidationStatus;

  // Content comparison
  diagramContent: {
    title: string;
    description: string;
    details: Record<string, any>;
  };
  corpusContent: {
    title: string;
    description: string;
    details: Record<string, any>;
  };

  // Issues found
  discrepancies: Discrepancy[];

  // Analysis
  analysisSummary: string;
  confidence: number;

  // Sources
  sourceReferences: SourceReference[];

  // Fix suggestion
  suggestedFix?: string;
}

// Full validation report
interface ValidationReport {
  id: string;
  diagramId: string;
  diagramName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

  // Summary
  summary: {
    totalComponents: number;
    validCount: number;
    warningCount: number;
    invalidCount: number;
    unverifiableCount: number;
    staleCount: number;
    validationScore: number;        // 0-100
  };

  // Per-component results
  results: ComponentValidationResult[];

  // Timestamps
  startedAt: string;
  completedAt: string;

  // Documents checked
  documentsValidatedAgainst: {
    id: string;
    filename: string;
    lastModified: string;
  }[];
}

// Source reference for validation
interface SourceReference {
  documentId: string;
  documentName: string;
  location: {
    page?: number;
    section?: string;
    lineStart?: number;
    lineEnd?: number;
  };
  excerpt: string;
  relevanceScore: number;
}
```

---

### 5. API Specification

#### 5.1 Trigger Validation

```
POST /api/diagrams/:diagramId/validate

Request:
{
  "options": {
    "validateAll": true,                    // Validate all components
    "componentIds": ["id1", "id2"],         // Or specific components only
    "includeGreyedOut": false,              // Skip greyed-out components
    "strictMode": false                      // Treat warnings as errors
  }
}

Response:
{
  "validationRunId": "uuid",
  "status": "RUNNING",
  "message": "Validation started for 11 components"
}
```

#### 5.2 Get Validation Status

```
GET /api/validations/:validationRunId/status

Response:
{
  "validationRunId": "uuid",
  "status": "RUNNING",
  "progress": {
    "completed": 6,
    "total": 11,
    "currentComponent": "BACKEND_LOGIC"
  },
  "partialResults": {
    "validCount": 4,
    "warningCount": 1,
    "invalidCount": 1
  }
}
```

#### 5.3 Get Validation Report

```
GET /api/validations/:validationRunId

Response:
{
  "report": {
    "id": "uuid",
    "diagramId": "uuid",
    "diagramName": "Add to Cart Flow",
    "status": "COMPLETED",

    "summary": {
      "totalComponents": 11,
      "validCount": 7,
      "warningCount": 2,
      "invalidCount": 1,
      "unverifiableCount": 1,
      "staleCount": 0,
      "validationScore": 82
    },

    "results": [
      {
        "id": "result-uuid",
        "componentId": "node-api-endpoint",
        "componentType": "API_ENDPOINT",
        "status": "INVALID",

        "diagramContent": {
          "title": "POST /api/cart/items",
          "description": "Add item to shopping cart"
        },
        "corpusContent": {
          "title": "POST /api/v2/cart/items",
          "description": "Add item to shopping cart with quantity"
        },

        "discrepancies": [
          {
            "id": "disc-1",
            "type": "CONTENT_MISMATCH",
            "severity": "MAJOR",
            "field": "title",
            "diagramValue": "/api/cart/items",
            "corpusValue": "/api/v2/cart/items",
            "explanation": "API endpoint path has been updated to v2",
            "sourceReference": {
              "documentId": "doc-uuid",
              "documentName": "api-docs.md",
              "location": { "lineStart": 245, "lineEnd": 250 },
              "excerpt": "POST /api/v2/cart/items - Add item to cart..."
            }
          }
        ],

        "analysisSummary": "The API endpoint path in the diagram is outdated. The current documentation shows v2 of the API.",
        "confidence": 0.95,
        "suggestedFix": "Update endpoint path from '/api/cart/items' to '/api/v2/cart/items'"
      },
      // ... more results
    ],

    "documentsValidatedAgainst": [
      {
        "id": "doc-uuid",
        "filename": "api-docs.md",
        "lastModified": "2024-01-20T10:30:00Z"
      }
    ],

    "startedAt": "2024-01-25T14:00:00Z",
    "completedAt": "2024-01-25T14:01:30Z"
  }
}
```

#### 5.4 Get Validation History

```
GET /api/diagrams/:diagramId/validations

Query params:
- limit: number (default 10)
- offset: number (default 0)

Response:
{
  "validations": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "validationScore": 82,
      "summary": {
        "validCount": 7,
        "warningCount": 2,
        "invalidCount": 1,
        "unverifiableCount": 1
      },
      "completedAt": "2024-01-25T14:01:30Z"
    },
    {
      "id": "uuid-older",
      "status": "COMPLETED",
      "validationScore": 95,
      "summary": {
        "validCount": 10,
        "warningCount": 1,
        "invalidCount": 0,
        "unverifiableCount": 0
      },
      "completedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5
}
```

#### 5.5 Get Component Validation Detail

```
GET /api/validations/:validationRunId/components/:componentId

Response:
{
  "result": ComponentValidationResult,
  "previousValidations": [
    {
      "validationRunId": "uuid",
      "status": "VALID",
      "validatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 6. Validation Engine

#### 6.1 Validation Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VALIDATION ENGINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LOAD DIAGRAM                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Load all components with their current content                      │ │
│     │ Identify which components to validate (skip greyed-out if option)   │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  2. CHECK STALENESS                                                          │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Compare document hashes with stored versions                        │ │
│     │ Flag components whose source docs have been modified                │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  3. FOR EACH COMPONENT                                                       │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ a. Build validation prompt with component content                   │ │
│     │ b. Query corpus for relevant sections                               │ │
│     │ c. Send to LLM for comparison                                       │ │
│     │ d. Parse response for discrepancies                                 │ │
│     │ e. Determine validation status                                      │ │
│     │ f. Store result                                                     │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  4. GENERATE REPORT                                                          │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ Aggregate results                                                   │ │
│     │ Calculate validation score                                          │ │
│     │ Generate summary                                                    │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2 Validation Prompt

```typescript
const VALIDATION_PROMPT = `
You are validating a diagram component against source documentation.

COMPONENT TYPE: {component_type}
COMPONENT FROM DIAGRAM:
- Title: {diagram_title}
- Description: {diagram_description}
- Details: {diagram_details}

SOURCE DOCUMENTATION:
---
{corpus_content}
---

TASK: Compare the diagram component with the source documentation and identify any discrepancies.

For each discrepancy found, provide:
1. type: CONTENT_MISMATCH | MISSING_IN_CORPUS | MISSING_IN_DIAGRAM | OUTDATED | CONFLICTING_SOURCES | PARTIAL_MATCH
2. severity: CRITICAL | MAJOR | MINOR | INFO
3. field: Which field has the issue (title, description, or specific detail key)
4. diagramValue: What the diagram says
5. corpusValue: What the corpus says
6. explanation: Clear explanation of the discrepancy

Also provide:
- overallStatus: VALID | WARNING | INVALID | UNVERIFIABLE
- analysisSummary: 1-2 sentence summary of findings
- confidence: 0.0-1.0 confidence in your assessment
- suggestedFix: If invalid/warning, what should be changed

If the component content matches the documentation, return status VALID with empty discrepancies.
If you cannot find relevant information in the corpus, return status UNVERIFIABLE.

Return your response as JSON:
{
  "overallStatus": "...",
  "discrepancies": [...],
  "analysisSummary": "...",
  "confidence": 0.0-1.0,
  "suggestedFix": "..." or null,
  "relevantExcerpts": [
    {
      "text": "...",
      "location": "..."
    }
  ]
}
`;
```

#### 6.3 Validation Service Implementation

```typescript
// services/validationService.ts

interface ValidationOptions {
  validateAll: boolean;
  componentIds?: string[];
  includeGreyedOut: boolean;
  strictMode: boolean;
}

class ValidationService {
  async validateDiagram(
    diagramId: string,
    options: ValidationOptions
  ): Promise<string> {
    // Create validation run record
    const runId = generateUUID();
    await db.createValidationRun(runId, diagramId);

    // Start async validation
    this.runValidation(runId, diagramId, options).catch(async (error) => {
      await db.updateValidationRun(runId, {
        status: 'FAILED',
        errorMessage: error.message
      });
    });

    return runId;
  }

  private async runValidation(
    runId: string,
    diagramId: string,
    options: ValidationOptions
  ): Promise<void> {
    await db.updateValidationRun(runId, { status: 'RUNNING', startedAt: new Date() });

    // Load diagram and components
    const diagram = await db.getDiagram(diagramId);
    let components = await db.getDiagramComponents(diagramId);

    // Filter components based on options
    if (!options.validateAll && options.componentIds?.length) {
      components = components.filter(c => options.componentIds!.includes(c.id));
    }
    if (!options.includeGreyedOut) {
      components = components.filter(c => c.status !== 'GREYED_OUT');
    }

    // Load corpus documents
    const documents = await db.getProjectDocuments(diagram.projectId);

    // Check for staleness
    const staleComponents = await this.checkStaleness(components, documents);

    // Validate each component
    const results: ComponentValidationResult[] = [];

    for (const component of components) {
      const isStale = staleComponents.has(component.id);

      if (isStale) {
        results.push({
          ...this.createStaleResult(component),
        });
        continue;
      }

      const result = await this.validateComponent(component, documents);
      results.push(result);

      // Update progress
      await db.updateValidationRun(runId, {
        currentStep: component.componentType
      });
    }

    // Calculate summary
    const summary = this.calculateSummary(results);

    // Store results
    for (const result of results) {
      await db.createValidationResult(runId, result);
    }

    // Complete validation run
    await db.updateValidationRun(runId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...summary
    });
  }

  private async validateComponent(
    component: DiagramComponent,
    documents: Document[]
  ): Promise<ComponentValidationResult> {
    // Combine document content
    const corpusContent = documents
      .map(d => `## ${d.filename}\n${d.content}`)
      .join('\n\n---\n\n');

    // Build prompt
    const prompt = VALIDATION_PROMPT
      .replace('{component_type}', component.componentType)
      .replace('{diagram_title}', component.title)
      .replace('{diagram_description}', component.description)
      .replace('{diagram_details}', JSON.stringify(component.details))
      .replace('{corpus_content}', corpusContent);

    // Call LLM
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse response
    const analysis = JSON.parse(response.content[0].text);

    // Build result
    return {
      id: generateUUID(),
      componentId: component.id,
      componentType: component.componentType,
      status: analysis.overallStatus,
      diagramContent: {
        title: component.title,
        description: component.description,
        details: component.details
      },
      corpusContent: {
        title: analysis.relevantExcerpts?.[0]?.text || '',
        description: '',
        details: {}
      },
      discrepancies: analysis.discrepancies.map((d: any) => ({
        id: generateUUID(),
        ...d,
        sourceReference: this.findSourceReference(d, documents)
      })),
      analysisSummary: analysis.analysisSummary,
      confidence: analysis.confidence,
      sourceReferences: this.extractSourceReferences(analysis, documents),
      suggestedFix: analysis.suggestedFix
    };
  }

  private calculateSummary(results: ComponentValidationResult[]) {
    const validCount = results.filter(r => r.status === 'VALID').length;
    const warningCount = results.filter(r => r.status === 'WARNING').length;
    const invalidCount = results.filter(r => r.status === 'INVALID').length;
    const unverifiableCount = results.filter(r => r.status === 'UNVERIFIABLE').length;
    const staleCount = results.filter(r => r.status === 'STALE').length;

    const totalComponents = results.length;
    const validationScore = totalComponents > 0
      ? Math.round(((validCount + warningCount * 0.5) / totalComponents) * 100)
      : 0;

    return {
      totalComponents,
      validCount,
      warningCount,
      invalidCount,
      unverifiableCount,
      staleCount,
      validationScore
    };
  }

  private async checkStaleness(
    components: DiagramComponent[],
    documents: Document[]
  ): Promise<Set<string>> {
    const staleComponentIds = new Set<string>();

    for (const component of components) {
      if (!component.sourceDocumentId) continue;

      const doc = documents.find(d => d.id === component.sourceDocumentId);
      if (!doc) continue;

      // Check if document was modified after component was last updated
      const docVersion = await db.getLatestDocumentVersion(doc.id);
      const currentHash = hashContent(doc.content);

      if (docVersion && docVersion.contentHash !== currentHash) {
        staleComponentIds.add(component.id);
      }
    }

    return staleComponentIds;
  }

  private createStaleResult(component: DiagramComponent): ComponentValidationResult {
    return {
      id: generateUUID(),
      componentId: component.id,
      componentType: component.componentType,
      status: 'STALE',
      diagramContent: {
        title: component.title,
        description: component.description,
        details: component.details
      },
      corpusContent: { title: '', description: '', details: {} },
      discrepancies: [{
        id: generateUUID(),
        type: 'OUTDATED',
        severity: 'WARNING',
        field: 'source',
        diagramValue: 'Content from previous version',
        corpusValue: 'Source document has been updated',
        explanation: 'The source document has been modified since this component was last generated or validated.'
      }],
      analysisSummary: 'Source document has changed. Re-generation recommended.',
      confidence: 1.0,
      sourceReferences: [],
      suggestedFix: 'Regenerate this component from the updated source document.'
    };
  }
}
```

---

### 7. Frontend Components

#### 7.1 Component Structure

```
src/
├── components/
│   ├── ... (MVP1 & MVP2 components)
│   │
│   ├── validation/
│   │   ├── ValidateButton.tsx          # Trigger validation
│   │   ├── ValidationProgress.tsx      # Progress indicator
│   │   ├── ValidationBadge.tsx         # Status badge on nodes
│   │   ├── ValidationReport.tsx        # Full report view
│   │   ├── ValidationSummary.tsx       # Summary card
│   │   ├── DiscrepancyList.tsx         # List of issues
│   │   ├── DiscrepancyCard.tsx         # Single discrepancy detail
│   │   ├── ComponentValidationDetail.tsx # Per-component detail
│   │   └── ValidationHistory.tsx       # Past validations
│   │
│   └── diagram/
│       └── nodes/
│           └── BaseNode.tsx            # Updated with validation status
```

#### 7.2 Validation Badge on Nodes

```tsx
// components/validation/ValidationBadge.tsx
import React from 'react';

interface ValidationBadgeProps {
  status: ValidationStatus;
  onClick?: () => void;
}

export function ValidationBadge({ status, onClick }: ValidationBadgeProps) {
  const config = {
    VALID: { icon: '✅', color: '#4CAF50', label: 'Valid' },
    WARNING: { icon: '⚠️', color: '#FF9800', label: 'Warning' },
    INVALID: { icon: '❌', color: '#F44336', label: 'Invalid' },
    UNVERIFIABLE: { icon: '❓', color: '#9E9E9E', label: 'Unverifiable' },
    STALE: { icon: '🔄', color: '#2196F3', label: 'Stale' },
    NOT_VALIDATED: { icon: '⚪', color: '#BDBDBD', label: 'Not validated' }
  };

  const { icon, color, label } = config[status];

  return (
    <div
      className="validation-badge"
      style={{ backgroundColor: color }}
      title={label}
      onClick={onClick}
    >
      <span className="badge-icon">{icon}</span>
    </div>
  );
}
```

#### 7.3 Updated Node with Validation Status

```tsx
// components/diagram/nodes/BaseNode.tsx (updated)
import { ValidationBadge } from '../validation/ValidationBadge';

export const BaseNode = memo(({ id, data, selected }: NodeProps<ComponentNodeData>) => {
  return (
    <div className={`component-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />

      {/* Validation badge in corner */}
      {data.validationStatus && (
        <div className="validation-badge-container">
          <ValidationBadge
            status={data.validationStatus}
            onClick={() => data.onShowValidation?.(id)}
          />
        </div>
      )}

      {/* Header */}
      <div className="node-header">
        <span className="node-title">{data.title}</span>
        {data.isUserModified && <span className="modified-badge">✎</span>}
      </div>

      {/* Description */}
      <div className="node-description">{data.description}</div>

      {/* Footer with validation indicator */}
      <div className="node-footer">
        {data.status === 'POPULATED' && (
          <span className="confidence">{Math.round(data.confidence * 100)}%</span>
        )}
        {data.sourceExcerpt && (
          <span className="source-badge" title={data.sourceExcerpt}>📎</span>
        )}
        <button className="edit-btn" onClick={() => data.onEdit(id)}>✏️</button>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
```

#### 7.4 Validation Report Component

```tsx
// components/validation/ValidationReport.tsx
import React from 'react';
import { ValidationSummary } from './ValidationSummary';
import { DiscrepancyList } from './DiscrepancyList';

interface ValidationReportProps {
  report: ValidationReport;
  onClose: () => void;
  onComponentClick: (componentId: string) => void;
}

export function ValidationReport({ report, onClose, onComponentClick }: ValidationReportProps) {
  const invalidResults = report.results.filter(r =>
    r.status === 'INVALID' || r.status === 'WARNING'
  );

  return (
    <div className="validation-report">
      <div className="report-header">
        <h2>Validation Report</h2>
        <span className="report-date">
          {new Date(report.completedAt).toLocaleString()}
        </span>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Summary */}
      <ValidationSummary summary={report.summary} />

      {/* Score */}
      <div className="validation-score">
        <div className="score-circle" data-score={report.summary.validationScore}>
          <span className="score-value">{report.summary.validationScore}</span>
          <span className="score-label">Score</span>
        </div>
      </div>

      {/* Issues */}
      {invalidResults.length > 0 ? (
        <div className="issues-section">
          <h3>Issues Found ({invalidResults.length})</h3>
          <DiscrepancyList
            results={invalidResults}
            onComponentClick={onComponentClick}
          />
        </div>
      ) : (
        <div className="no-issues">
          <span className="success-icon">✅</span>
          <p>No issues found! Your diagram is up to date.</p>
        </div>
      )}

      {/* Documents checked */}
      <div className="docs-section">
        <h4>Documents Validated Against</h4>
        <ul>
          {report.documentsValidatedAgainst.map(doc => (
            <li key={doc.id}>
              {doc.filename}
              <span className="doc-date">
                (modified {new Date(doc.lastModified).toLocaleDateString()})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

#### 7.5 Discrepancy Card

```tsx
// components/validation/DiscrepancyCard.tsx
import React from 'react';

interface DiscrepancyCardProps {
  result: ComponentValidationResult;
  onComponentClick: (componentId: string) => void;
}

export function DiscrepancyCard({ result, onComponentClick }: DiscrepancyCardProps) {
  const severityColors = {
    CRITICAL: '#D32F2F',
    MAJOR: '#F44336',
    MINOR: '#FF9800',
    INFO: '#2196F3'
  };

  return (
    <div className="discrepancy-card" data-status={result.status}>
      <div className="card-header">
        <span className="component-type">{result.componentType}</span>
        <ValidationBadge status={result.status} />
      </div>

      <div className="card-content">
        <p className="analysis-summary">{result.analysisSummary}</p>

        {result.discrepancies.map(disc => (
          <div
            key={disc.id}
            className="discrepancy-item"
            style={{ borderLeftColor: severityColors[disc.severity] }}
          >
            <div className="discrepancy-header">
              <span className="disc-type">{disc.type.replace(/_/g, ' ')}</span>
              <span className="disc-severity">{disc.severity}</span>
            </div>

            <div className="discrepancy-comparison">
              <div className="diagram-value">
                <label>Diagram says:</label>
                <span>{disc.diagramValue}</span>
              </div>
              <div className="corpus-value">
                <label>Corpus says:</label>
                <span>{disc.corpusValue}</span>
              </div>
            </div>

            <p className="disc-explanation">{disc.explanation}</p>

            {disc.sourceReference && (
              <div className="source-ref">
                📎 {disc.sourceReference.documentName}
                {disc.sourceReference.location.lineStart && (
                  <span> (lines {disc.sourceReference.location.lineStart}-{disc.sourceReference.location.lineEnd})</span>
                )}
              </div>
            )}
          </div>
        ))}

        {result.suggestedFix && (
          <div className="suggested-fix">
            <strong>Suggested fix:</strong>
            <p>{result.suggestedFix}</p>
          </div>
        )}
      </div>

      <div className="card-actions">
        <button onClick={() => onComponentClick(result.componentId)}>
          Go to Component
        </button>
      </div>
    </div>
  );
}
```

---

### 8. User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MVP3 User Flow                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

MVP1 & MVP2 Flow (unchanged):
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Upload  │────▶│  Discover│────▶│  Generate│────▶│  Edit    │────▶│  Save    │
│  Docs    │     │  Ops     │     │  Diagram │     │  Diagram │     │  Diagram │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                                          │
                                                                          ▼
MVP3 Addition:                                                 ┌──────────────────┐
                                                               │   View Diagram   │
                                                               │   with Editor    │
                                                               └────────┬─────────┘
                                                                        │
                                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            DIAGRAM WITH VALIDATION                              │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [💾 Save] [🔍 Validate] [📤 Export ▼]                    Last validated: Never │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌─────────┐      ┌─────────┐      ┌──────────────────┐                │   │
│  │   │ Add to  │ ───▶ │ Cart    │ ───▶ │  Security Layer  │ ───▶ ...      │   │
│  │   │ Cart    │ ⚪   │ Handler │ ⚪   │                  │ ⚪              │   │
│  │   │ Click   │      │         │      │  ┌────┐ ┌────┐   │                │   │
│  │   └─────────┘      └─────────┘      └──────────────────┘                │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ⚪ = Not validated                                                             │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        │ Click [🔍 Validate]
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                          VALIDATION IN PROGRESS                                 │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  🔍 Validating diagram against corpus...                                        │
│                                                                                 │
│  ████████████░░░░░░░░  6/11 components                                         │
│                                                                                 │
│  Currently validating: Backend Logic                                            │
│                                                                                 │
│  [Cancel]                                                                       │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        │ Validation complete
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            VALIDATION COMPLETE                                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌─────────┐      ┌─────────┐      ┌──────────────────┐                │   │
│  │   │ Add to  │ ───▶ │ Cart    │ ───▶ │  Security Layer  │ ───▶ ...      │   │
│  │   │ Cart    │ ✅   │ Handler │ ✅   │                  │ ⚠️              │   │
│  │   │ Click   │      │         │      │  ┌────┐ ┌────┐   │                │   │
│  │   └─────────┘      └─────────┘      └──────────────────┘                │   │
│  │                                                                          │   │
│  │   ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐       │   │
│  │   │ POST    │ ───▶ │ Cart    │ ───▶ │ Write   │ ◀─── │         │       │   │
│  │   │ /api/   │ ❌   │ Service │ ✅   │ cart_   │ ✅   │         │       │   │
│  │   │ cart    │      │         │      │ items   │      │         │       │   │
│  │   └─────────┘      └─────────┘      └─────────┘      └─────────┘       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ✅ Valid (7)  ⚠️ Warning (2)  ❌ Invalid (1)  ❓ Unverifiable (1)              │
│                                                                                 │
│  [View Full Report]                                                             │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        │ Click [View Full Report]
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            VALIDATION REPORT                                    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                        [Close]  │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                           │ │
│  │  Validation Score: 82/100                                                 │ │
│  │                                                                           │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  ✅ Valid: 7  │  ⚠️ Warning: 2  │  ❌ Invalid: 1  │  ❓ Unknown: 1  │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  Issues Found (3):                                                              │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ ❌ API_ENDPOINT                                                           │ │
│  │ ─────────────────────────────────────────────────────────────────────────│ │
│  │ The API endpoint path has been updated in the documentation.              │ │
│  │                                                                           │ │
│  │ ┌─────────────────────────────────────────────────────────────────────┐  │ │
│  │ │ CONTENT_MISMATCH (MAJOR)                                            │  │ │
│  │ │ Field: title                                                        │  │ │
│  │ │ Diagram: /api/cart/items                                            │  │ │
│  │ │ Corpus:  /api/v2/cart/items                                         │  │ │
│  │ │                                                                     │  │ │
│  │ │ 📎 api-docs.md (lines 245-250)                                      │  │ │
│  │ └─────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                           │ │
│  │ Suggested fix: Update path from '/api/cart/items' to '/api/v2/cart/items'│ │
│  │                                                                           │ │
│  │ [Go to Component]                                                         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ LOAD_BALANCER                                                          │ │
│  │ ...                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### 9. Validation Score Calculation

```typescript
function calculateValidationScore(results: ComponentValidationResult[]): number {
  const weights = {
    VALID: 1.0,
    WARNING: 0.5,
    INVALID: 0.0,
    UNVERIFIABLE: 0.3,  // Partial credit - not the diagram's fault
    STALE: 0.2          // Needs attention but may still be correct
  };

  const totalWeight = results.length;
  const earnedWeight = results.reduce((sum, r) => sum + weights[r.status], 0);

  return Math.round((earnedWeight / totalWeight) * 100);
}
```

---

### 10. Implementation Steps

#### Phase 1: Data Model & API (Day 1-3)
1. Add new database tables (validation_runs, validation_results, document_versions)
2. Create validation trigger endpoint
3. Create validation status endpoint
4. Create validation report endpoint
5. Create validation history endpoint
6. Implement document version tracking

#### Phase 2: Validation Engine (Day 4-7)
1. Build validation service structure
2. Implement staleness detection
3. Create validation prompt
4. Implement LLM-based comparison
5. Parse and categorize discrepancies
6. Calculate validation scores
7. Generate detailed reports

#### Phase 3: Frontend - Trigger & Progress (Day 8-9)
1. Add Validate button to toolbar
2. Create validation progress modal
3. Implement polling for status updates
4. Handle validation errors

#### Phase 4: Frontend - Visualization (Day 10-12)
1. Add ValidationBadge component
2. Update nodes to show validation status
3. Create ValidationReport component
4. Create DiscrepancyCard component
5. Create ValidationSummary component
6. Add validation history view

#### Phase 5: Polish & Integration (Day 13-14)
1. Click badge to see component validation detail
2. "Go to Component" navigation from report
3. Persist validation status on diagram reload
4. Loading states and error handling
5. Responsive design

#### Phase 6: Testing (Day 15)
1. Unit tests for validation logic
2. Integration tests for API
3. E2E tests for full flow
4. Edge case testing (empty corpus, no discrepancies, all invalid)

---

### 11. Cost Estimation

#### LLM Costs (Claude 3 Haiku)

| Scenario | Components | Est. Input Tokens | Est. Output Tokens | Cost per Validation |
|----------|------------|-------------------|--------------------|--------------------|
| Small diagram | 8 | ~40,000 | ~4,000 | ~$0.015 |
| Full template | 11 | ~55,000 | ~5,500 | ~$0.02 |
| Large corpus | 11 | ~150,000 | ~5,500 | ~$0.05 |

*Validation is more expensive than generation due to comparison prompts*

#### Infrastructure

Same as MVP2 - near zero with free tier hosting.

---

### 12. Success Criteria

The MVP3 is successful if:

1. Validation completes in under 2 minutes for typical diagram
2. Discrepancies are identified with at least 80% accuracy
3. Validation status is clearly visible on each component
4. Report clearly explains each discrepancy
5. Suggested fixes are actionable
6. Users can navigate from report to specific components
7. Validation history is accessible
8. Staleness detection works correctly

---

### 13. Limitations (Addressed in Future MVPs)

| Limitation | Future Enhancement |
|------------|-------------------|
| Manual fix only | MVP4: Auto-fix option for simple discrepancies |
| One-time validation | MVP4: Watch mode for continuous validation |
| Fixed validation rules | MVP4: Customizable validation rules |
| Single corpus | MVP4: Validate against multiple corpora |
| No severity filtering | MVP4: Filter report by severity |

---

### 14. Example Validation Scenarios

#### Scenario 1: Outdated API Endpoint
```
Diagram: POST /api/cart/items
Corpus:  POST /api/v2/cart/items

Result: INVALID
Type: CONTENT_MISMATCH
Severity: MAJOR
Fix: Update endpoint path to v2
```

#### Scenario 2: Missing Detail
```
Diagram: "Add item to cart"
Corpus:  "Add item to cart with quantity validation (max 99)"

Result: WARNING
Type: MISSING_IN_DIAGRAM
Severity: MINOR
Fix: Add quantity validation detail
```

#### Scenario 3: Conflicting Sources
```
Doc A: "Authentication via JWT"
Doc B: "Authentication via session cookies"

Result: WARNING
Type: CONFLICTING_SOURCES
Severity: MAJOR
Fix: Clarify which auth method is current
```

#### Scenario 4: Component Not Found
```
Diagram: "Redis cache layer"
Corpus: (no mention of Redis)

Result: UNVERIFIABLE
Type: MISSING_IN_CORPUS
Severity: INFO
Fix: Consider adding documentation for cache layer
```

---

*Document Version: 1.0*
*Builds on: MVP1 (Operation Discovery), MVP2 (Diagram Rendering & Editing)*
*New Feature: Diagram Validation Against Corpus*
