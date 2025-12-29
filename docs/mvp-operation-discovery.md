# MVP: Operation Discovery
## VeoEndToEnd - Minimum Viable Product

### 1. MVP Goal

Enable users to upload documents and discover client operations/user experiences using LLM analysis, with the ability to review and correct the results.

**What's IN scope:**
- Document upload (text files, markdown, PDF)
- LLM-based operation discovery
- List view of discovered operations
- User correction of the list (confirm, reject, rename, add)

**What's OUT of scope for MVP:**
- Vector store / semantic search
- Templates and diagram generation
- Multi-user collaboration
- Version history
- Validation against corpus

---

### 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   Upload    │  │   Discovery     │  │   Operations        │  │
│  │   Panel     │  │   Status        │  │   List Editor       │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Node.js/Python)                │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   Upload    │  │   Discovery     │  │   Operations        │  │
│  │   Endpoint  │  │   Endpoint      │  │   CRUD              │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  File     │   │  SQLite/  │   │  LLM API  │
       │  Storage  │   │  Postgres │   │  (Claude) │
       └───────────┘   └───────────┘   └───────────┘
```

---

### 3. Core Components

#### 3.1 Document Processor

Handles file uploads and text extraction. No embeddings, no vector storage.

```
Upload Flow:
┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User │────▶│ Upload   │────▶│ Extract  │────▶│ Store    │
│ File │     │ Endpoint │     │ Text     │     │ as Text  │
└──────┘     └──────────┘     └──────────┘     └──────────┘
```

**Supported formats:**
- `.txt` - Direct read
- `.md` - Direct read
- `.pdf` - Use `pdf-parse` or similar library

**Storage:** Store extracted text in a simple `documents` table. No chunking for storage - just keep the full text.

#### 3.2 Discovery Engine

Uses direct LLM calls to analyze documents and extract operations.

```
Discovery Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Load All │────▶│ Chunk if │────▶│ Send to  │────▶│ Parse &  │
│ Docs     │     │ Too Large│     │ LLM      │     │ Store    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

**Chunking Strategy (only if needed for context limits):**
- If total corpus < 100K tokens: Send everything in one request
- If larger: Process documents one at a time, then merge results

**No vector store needed** - we're doing direct text analysis, not semantic search.

#### 3.3 Operations Manager

Simple CRUD for managing the discovered operations list.

---

### 4. Data Model

#### 4.1 Database Schema (SQLite for MVP)

```sql
-- Projects group documents together
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded documents with extracted text
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    filename TEXT NOT NULL,
    content TEXT NOT NULL,           -- Full extracted text
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discovered operations
CREATE TABLE operations (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('CLIENT_OPERATION', 'USER_INTERACTION')),
    status TEXT DEFAULT 'DISCOVERED'
        CHECK(status IN ('DISCOVERED', 'CONFIRMED', 'REJECTED', 'MANUAL')),
    confidence REAL,                 -- 0.0 to 1.0
    source_excerpt TEXT,             -- Relevant text from document
    source_document_id TEXT REFERENCES documents(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track discovery jobs
CREATE TABLE discovery_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    status TEXT DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    operations_found INTEGER
);
```

---

### 5. API Specification

#### 5.1 Project Management

```
POST /api/projects
Request:  { "name": "My Project" }
Response: { "id": "uuid", "name": "My Project", "created_at": "..." }

GET /api/projects
Response: { "projects": [...] }

GET /api/projects/:id
Response: { "id": "...", "name": "...", "documents": [...], "operations": [...] }
```

#### 5.2 Document Upload

```
POST /api/projects/:projectId/documents
Content-Type: multipart/form-data
Body: file (binary)

Response:
{
  "id": "uuid",
  "filename": "api-docs.md",
  "contentPreview": "First 200 chars...",
  "characterCount": 15000
}
```

#### 5.3 Discovery

```
POST /api/projects/:projectId/discover
Request: {
  "aiService": "claude"    // Optional, defaults to configured service
}

Response:
{
  "jobId": "uuid",
  "status": "PROCESSING"
}
```

```
GET /api/projects/:projectId/discover/:jobId
Response:
{
  "jobId": "uuid",
  "status": "COMPLETED",
  "operationsFound": 12
}
```

#### 5.4 Operations CRUD

```
GET /api/projects/:projectId/operations
Response:
{
  "operations": [
    {
      "id": "uuid",
      "name": "User Login",
      "description": "Authentication flow for existing users",
      "type": "USER_INTERACTION",
      "status": "DISCOVERED",
      "confidence": 0.92,
      "sourceExcerpt": "The login endpoint accepts..."
    }
  ]
}
```

```
PATCH /api/projects/:projectId/operations/:id
Request:
{
  "status": "CONFIRMED",
  "name": "User Authentication"    // Optional rename
}

Response: { "operation": {...} }
```

```
POST /api/projects/:projectId/operations
Request:
{
  "name": "Password Reset",
  "description": "User-initiated password reset flow",
  "type": "USER_INTERACTION"
}

Response: { "operation": {..., "status": "MANUAL"} }
```

```
DELETE /api/projects/:projectId/operations/:id
Response: { "success": true }
```

---

### 6. LLM Integration

#### 6.1 Single Provider Approach

For MVP, support one LLM provider (Claude recommended). No orchestration complexity.

```typescript
// config.ts
export const AI_CONFIG = {
  provider: 'anthropic',
  model: 'claude-3-haiku-20240307',  // Fast and cheap for MVP
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxTokens: 4096
};
```

#### 6.2 Discovery Prompt

```typescript
const DISCOVERY_PROMPT = `You are analyzing documentation to identify client operations and user interactions/experiences.

A "Client Operation" is a distinct action or process that a client/customer initiates or is part of (e.g., "Place Order", "Process Payment", "Submit Application").

A "User Interaction" is a specific touchpoint or experience a user has with the system (e.g., "Login Flow", "Search Products", "View Dashboard").

Analyze the following documentation and extract all client operations and user interactions you can identify.

For each one, provide:
- name: A clear, concise name (2-5 words)
- description: One sentence explaining what it is
- type: Either "CLIENT_OPERATION" or "USER_INTERACTION"
- confidence: Your confidence level from 0.0 to 1.0
- sourceExcerpt: A brief quote from the text that supports this identification

Return your response as a JSON array.

DOCUMENTATION:
---
{document_content}
---

Respond with valid JSON only:`;
```

#### 6.3 Response Parsing

```typescript
interface DiscoveredOperation {
  name: string;
  description: string;
  type: 'CLIENT_OPERATION' | 'USER_INTERACTION';
  confidence: number;
  sourceExcerpt: string;
}

async function discoverOperations(projectId: string): Promise<DiscoveredOperation[]> {
  // 1. Load all documents for the project
  const documents = await db.getDocuments(projectId);
  const fullText = documents.map(d =>
    `## ${d.filename}\n${d.content}`
  ).join('\n\n---\n\n');

  // 2. Check size - if too large, process in batches
  const tokenCount = estimateTokens(fullText);

  let operations: DiscoveredOperation[] = [];

  if (tokenCount < 80000) {
    // Process all at once
    operations = await callLLM(fullText);
  } else {
    // Process document by document
    for (const doc of documents) {
      const docOps = await callLLM(doc.content);
      operations.push(...docOps);
    }
    // Deduplicate similar operations
    operations = deduplicateOperations(operations);
  }

  return operations;
}

async function callLLM(content: string): Promise<DiscoveredOperation[]> {
  const prompt = DISCOVERY_PROMPT.replace('{document_content}', content);

  const response = await anthropic.messages.create({
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens,
    messages: [{ role: 'user', content: prompt }]
  });

  // Parse JSON from response
  const text = response.content[0].text;
  return JSON.parse(text);
}
```

#### 6.4 Simple Deduplication

```typescript
function deduplicateOperations(ops: DiscoveredOperation[]): DiscoveredOperation[] {
  const seen = new Map<string, DiscoveredOperation>();

  for (const op of ops) {
    const key = op.name.toLowerCase().trim();
    const existing = seen.get(key);

    if (!existing || op.confidence > existing.confidence) {
      seen.set(key, op);
    }
  }

  return Array.from(seen.values());
}
```

---

### 7. Frontend Components

#### 7.1 Component Structure

```
src/
├── App.tsx
├── components/
│   ├── ProjectList.tsx       # List/create projects
│   ├── DocumentUpload.tsx    # Drag-drop file upload
│   ├── DocumentList.tsx      # Show uploaded docs
│   ├── DiscoveryButton.tsx   # Trigger discovery + show status
│   ├── OperationsList.tsx    # Main list of operations
│   └── OperationCard.tsx     # Individual operation with actions
└── api/
    └── client.ts             # API calls
```

#### 7.2 Key UI States

**Operations List View:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Project: E-Commerce Platform                                    │
│  Documents: 3 uploaded | Operations: 12 discovered              │
├─────────────────────────────────────────────────────────────────┤
│  [🔍 Run Discovery]  [+ Add Operation]                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟡 User Login                                    92% conf   ││
│  │ Authentication flow for existing users                      ││
│  │ Type: USER_INTERACTION                                      ││
│  │ Source: "The /auth/login endpoint accepts..."               ││
│  │                                                             ││
│  │ [✓ Confirm]  [✗ Reject]  [✎ Edit]                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✓ Place Order                                    88% conf   ││
│  │ Customer completes purchase checkout                        ││
│  │ Type: CLIENT_OPERATION                         [CONFIRMED]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ⊘ Newsletter Signup                             45% conf   ││
│  │ Optional email subscription                    [REJECTED]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Legend: 🟡 Pending Review  ✓ Confirmed  ⊘ Rejected  ➕ Manual
```

#### 7.3 Status Badges

| Status | Color | Description |
|--------|-------|-------------|
| DISCOVERED | Yellow | Pending user review |
| CONFIRMED | Green | User verified as correct |
| REJECTED | Gray/Strikethrough | User marked as incorrect |
| MANUAL | Blue | User added manually |

---

### 8. Project Structure

```
veoendtoend/
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── api/
│   └── public/
│
├── backend/
│   ├── package.json          # or requirements.txt for Python
│   ├── src/
│   │   ├── index.ts          # Express/FastAPI entry
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   ├── documents.ts
│   │   │   ├── operations.ts
│   │   │   └── discovery.ts
│   │   ├── services/
│   │   │   ├── documentProcessor.ts
│   │   │   ├── discoveryEngine.ts
│   │   │   └── llmClient.ts
│   │   └── db/
│   │       ├── schema.sql
│   │       └── client.ts
│   └── uploads/              # Stored files
│
├── docs/
│   ├── highleveldescription
│   ├── system-architecture.md
│   ├── component-design.md
│   └── mvp-operation-discovery.md
│
└── docker-compose.yml        # Optional: for easy setup
```

---

### 9. Technology Choices (MVP)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend | React + Vite | Fast setup, widely known |
| Backend | Node.js + Express | Simple, JavaScript everywhere |
| Database | SQLite | Zero setup, file-based, sufficient for MVP |
| File Storage | Local filesystem | Simple, upgrade to S3 later |
| LLM | Claude 3 Haiku | Fast, cheap, good quality |
| PDF Parsing | pdf-parse | Simple npm package |

**Alternative:** Python + FastAPI backend if team prefers Python.

---

### 10. Implementation Steps

#### Phase 1: Basic Infrastructure (Day 1-2)
1. Set up React frontend with Vite
2. Set up Express backend
3. Initialize SQLite database with schema
4. Create basic project CRUD endpoints
5. Create document upload endpoint with text extraction

#### Phase 2: Discovery Engine (Day 3-4)
1. Set up Anthropic SDK
2. Implement discovery prompt
3. Create discovery endpoint (async job)
4. Parse and store discovered operations
5. Handle large documents (chunking)

#### Phase 3: Operations Management (Day 5-6)
1. Build operations list UI
2. Implement confirm/reject actions
3. Add manual operation creation
4. Add edit operation functionality
5. Polish UI with status indicators

#### Phase 4: Polish & Deploy (Day 7)
1. Error handling and loading states
2. Basic styling
3. Environment configuration
4. Deploy to simple hosting (Railway, Render, or Fly.io)

---

### 11. Future Enhancements (Post-MVP)

After validating the MVP works, consider adding:

1. **Vector Store** - For semantic search within corpus (when corpus gets large)
2. **Templates** - Visual diagram generation
3. **Multiple LLM Support** - Switch between providers
4. **User Authentication** - Multi-user support
5. **Export** - Download operations as CSV/JSON
6. **Batch Operations** - Confirm/reject multiple at once

---

### 12. Cost Estimation

#### LLM Costs (Claude 3 Haiku)

| Corpus Size | Est. Input Tokens | Est. Output Tokens | Cost per Discovery |
|-------------|-------------------|--------------------|--------------------|
| Small (10 pages) | ~5,000 | ~1,000 | ~$0.002 |
| Medium (50 pages) | ~25,000 | ~2,000 | ~$0.008 |
| Large (200 pages) | ~100,000 | ~4,000 | ~$0.03 |

*Based on Claude 3 Haiku pricing: $0.25/1M input, $1.25/1M output*

#### Infrastructure (Monthly)

| Service | Cost |
|---------|------|
| Hosting (Render/Railway free tier) | $0 |
| Upgrade to paid hosting | ~$7/mo |
| Database (SQLite) | $0 (file-based) |

**Total MVP monthly cost:** Near zero (just LLM API costs per use)

---

### 13. Success Criteria

The MVP is successful if:

1. Users can upload 1-10 documents
2. Discovery runs in under 60 seconds for typical corpus
3. At least 70% of discovered operations are relevant
4. Users can confirm/reject/edit all operations
5. System handles errors gracefully

---

*Document Version: 1.0*
*Created for MVP Development Sprint*
