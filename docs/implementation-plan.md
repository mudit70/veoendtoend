# Phased Implementation Plan
## VeoEndToEnd - MVP1, MVP2, MVP3 Combined Roadmap

### Executive Summary

This document provides a detailed, phased implementation plan covering all three MVPs:
- **MVP1**: Operation Discovery
- **MVP2**: Diagram Rendering, Editing & Saving
- **MVP3**: Diagram Validation

**Total Duration**: 8 weeks (40 working days)
**Team Size**: 2-3 developers

---

## Phase Overview

| Phase | Name | Duration | MVPs Covered |
|-------|------|----------|--------------|
| 1 | Foundation & Infrastructure | Week 1 | Setup for all |
| 2 | Document Management | Week 2 | MVP1 |
| 3 | Operation Discovery | Week 2-3 | MVP1 |
| 4 | Diagram Data Layer | Week 3-4 | MVP2 |
| 5 | ReactFlow Integration | Week 4-5 | MVP2 |
| 6 | Diagram Editing & Saving | Week 5-6 | MVP2 |
| 7 | Validation Engine | Week 6-7 | MVP3 |
| 8 | Validation UI & Reports | Week 7-8 | MVP3 |
| 9 | Polish, Integration & E2E | Week 8 | All |

---

## Phase 1: Foundation & Infrastructure (Days 1-5)

### 1.1 Objectives
- Set up project structure
- Configure development environment
- Establish CI/CD pipeline
- Create database schema
- Set up testing infrastructure

### 1.2 Tasks

#### Day 1: Project Setup
```
□ Initialize monorepo structure
  ├── frontend/          # React + Vite
  ├── backend/           # Node.js + Express
  ├── shared/            # Shared types
  └── e2e/               # Playwright tests

□ Configure package.json for both frontend and backend
□ Set up TypeScript configuration
□ Configure ESLint and Prettier
□ Create .env.example files
```

#### Day 2: Backend Foundation
```
□ Set up Express server with middleware
□ Configure CORS, body-parser, error handling
□ Set up SQLite with better-sqlite3
□ Create database initialization script
□ Implement base API structure
```

#### Day 3: Database Schema
```sql
-- Core tables (all MVPs)
□ Create projects table
□ Create documents table
□ Create operations table
□ Create diagrams table
□ Create diagram_components table
□ Create diagram_edges table
□ Create validation_runs table
□ Create validation_results table
□ Create document_versions table
□ Create migrations system
```

#### Day 4: Frontend Foundation
```
□ Set up React with Vite
□ Configure React Router
□ Set up Tailwind CSS
□ Create base layout components
□ Set up API client (axios/fetch wrapper)
□ Configure environment variables
```

#### Day 5: Testing & CI/CD
```
□ Set up Jest for backend unit tests
□ Set up Vitest for frontend unit tests
□ Set up Playwright for E2E tests
□ Configure GitHub Actions CI pipeline
□ Set up test database fixtures
```

### 1.3 Tests for Phase 1

#### Backend Unit Tests
```typescript
// tests/unit/database.test.ts
describe('Database', () => {
  test('should initialize all tables', async () => {
    const tables = await db.getTables();
    expect(tables).toContain('projects');
    expect(tables).toContain('documents');
    expect(tables).toContain('operations');
    expect(tables).toContain('diagrams');
  });

  test('should run migrations successfully', async () => {
    const result = await db.migrate();
    expect(result.success).toBe(true);
  });
});

// tests/unit/api.test.ts
describe('API Server', () => {
  test('should respond to health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  test('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
  });
});
```

#### Frontend Unit Tests
```typescript
// tests/unit/App.test.tsx
describe('App', () => {
  test('should render without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('should have navigation', () => {
    render(<App />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
```

#### Playwright E2E Tests
```typescript
// e2e/foundation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Foundation', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VeoEndToEnd/);
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('API health check should pass', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
```

### 1.4 Deliverables
- [ ] Working development environment
- [ ] Database with all tables created
- [ ] CI pipeline running tests on push
- [ ] Basic frontend shell loading

---

## Phase 2: Document Management (Days 6-10)

### 2.1 Objectives
- Implement project CRUD
- Implement document upload and text extraction
- Build document management UI

### 2.2 Tasks

#### Day 6: Project API
```
□ POST /api/projects - Create project
□ GET /api/projects - List projects
□ GET /api/projects/:id - Get project details
□ PUT /api/projects/:id - Update project
□ DELETE /api/projects/:id - Delete project
```

#### Day 7: Document Upload API
```
□ Configure multer for file uploads
□ POST /api/projects/:id/documents - Upload document
□ Implement text extraction for .txt, .md
□ Implement PDF text extraction (pdf-parse)
□ GET /api/projects/:id/documents - List documents
□ DELETE /api/documents/:id - Delete document
```

#### Day 8: Document Processing
```
□ Create document processor service
□ Handle large files (chunking for storage)
□ Store extracted text in database
□ Calculate and store document hash (for versioning)
□ Error handling for corrupt files
```

#### Day 9: Frontend - Project Management
```
□ Create ProjectList component
□ Create ProjectCard component
□ Create NewProjectModal component
□ Implement project creation flow
□ Implement project selection/navigation
```

#### Day 10: Frontend - Document Upload
```
□ Create DocumentUpload component (drag & drop)
□ Create DocumentList component
□ Show upload progress
□ Display document preview/info
□ Implement document deletion
```

### 2.3 Tests for Phase 2

#### Backend Unit Tests
```typescript
// tests/unit/projects.test.ts
describe('Projects API', () => {
  test('should create a new project', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe('Test Project');
  });

  test('should list all projects', async () => {
    await createTestProject('Project 1');
    await createTestProject('Project 2');

    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(200);
    expect(response.body.projects.length).toBe(2);
  });

  test('should delete a project', async () => {
    const project = await createTestProject('To Delete');

    const response = await request(app)
      .delete(`/api/projects/${project.id}`);

    expect(response.status).toBe(200);
  });
});

// tests/unit/documents.test.ts
describe('Documents API', () => {
  test('should upload a text document', async () => {
    const project = await createTestProject('Test');

    const response = await request(app)
      .post(`/api/projects/${project.id}/documents`)
      .attach('file', Buffer.from('Test content'), 'test.txt');

    expect(response.status).toBe(201);
    expect(response.body.filename).toBe('test.txt');
    expect(response.body.content).toContain('Test content');
  });

  test('should upload a markdown document', async () => {
    const project = await createTestProject('Test');
    const mdContent = '# Title\n\nSome content';

    const response = await request(app)
      .post(`/api/projects/${project.id}/documents`)
      .attach('file', Buffer.from(mdContent), 'readme.md');

    expect(response.status).toBe(201);
    expect(response.body.content).toContain('# Title');
  });

  test('should reject unsupported file types', async () => {
    const project = await createTestProject('Test');

    const response = await request(app)
      .post(`/api/projects/${project.id}/documents`)
      .attach('file', Buffer.from('binary'), 'file.exe');

    expect(response.status).toBe(400);
  });
});

// tests/unit/documentProcessor.test.ts
describe('Document Processor', () => {
  test('should extract text from PDF', async () => {
    const pdfBuffer = await loadFixture('sample.pdf');
    const text = await documentProcessor.extractText(pdfBuffer, 'application/pdf');

    expect(text).toContain('Expected content from PDF');
  });

  test('should calculate consistent hash', () => {
    const content = 'Test content';
    const hash1 = documentProcessor.hashContent(content);
    const hash2 = documentProcessor.hashContent(content);

    expect(hash1).toBe(hash2);
  });
});
```

#### Frontend Unit Tests
```typescript
// tests/unit/ProjectList.test.tsx
describe('ProjectList', () => {
  test('should display loading state', () => {
    render(<ProjectList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('should display projects', async () => {
    mockApi.getProjects.mockResolvedValue([
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' }
    ]);

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
  });

  test('should show empty state when no projects', async () => {
    mockApi.getProjects.mockResolvedValue([]);

    render(<ProjectList />);

    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });
});

// tests/unit/DocumentUpload.test.tsx
describe('DocumentUpload', () => {
  test('should accept dropped files', async () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    const dropzone = screen.getByTestId('dropzone');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(expect.any(File));
    });
  });

  test('should show upload progress', async () => {
    render(<DocumentUpload projectId="123" />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});
```

#### Playwright E2E Tests
```typescript
// e2e/documents.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test project first
    await page.goto('/');
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="projectName"]', 'E2E Test Project');
    await page.click('button:has-text("Create")');
    await expect(page.locator('text=E2E Test Project')).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("New Project")');

    await expect(page.locator('.modal')).toBeVisible();
    await page.fill('input[name="projectName"]', 'My New Project');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=My New Project')).toBeVisible();
  });

  test('should upload a document', async ({ page }) => {
    await page.goto('/projects/test-project');

    // Upload via file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'api-docs.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# API Documentation\n\nSome content here')
    });

    // Wait for upload to complete
    await expect(page.locator('text=api-docs.md')).toBeVisible();
    await expect(page.locator('text=Upload complete')).toBeVisible();
  });

  test('should display uploaded documents', async ({ page }) => {
    // Upload a document first
    await uploadTestDocument(page, 'test-doc.txt', 'Test content');

    await page.goto('/projects/test-project');

    await expect(page.locator('.document-list')).toBeVisible();
    await expect(page.locator('text=test-doc.txt')).toBeVisible();
  });

  test('should delete a document', async ({ page }) => {
    await uploadTestDocument(page, 'to-delete.txt', 'Delete me');
    await page.goto('/projects/test-project');

    await page.locator('.document-card:has-text("to-delete.txt")').hover();
    await page.click('button[aria-label="Delete document"]');
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=to-delete.txt')).not.toBeVisible();
  });

  test('should show document preview', async ({ page }) => {
    await uploadTestDocument(page, 'preview.md', '# Preview Test\n\nContent here');
    await page.goto('/projects/test-project');

    await page.click('.document-card:has-text("preview.md")');

    await expect(page.locator('.document-preview')).toBeVisible();
    await expect(page.locator('text=Preview Test')).toBeVisible();
  });
});
```

### 2.4 Deliverables
- [ ] Project CRUD API working
- [ ] Document upload with text extraction
- [ ] Project management UI
- [ ] Document upload UI with drag & drop
- [ ] All Phase 2 tests passing

---

## Phase 3: Operation Discovery (Days 11-15)

### 3.1 Objectives
- Integrate LLM for operation discovery
- Build discovery job system
- Create operations management UI

### 3.2 Tasks

#### Day 11: LLM Integration
```
□ Set up Anthropic SDK
□ Create LLM client wrapper
□ Implement rate limiting
□ Create discovery prompt template
□ Implement response parsing
```

#### Day 12: Discovery API
```
□ POST /api/projects/:id/discover - Start discovery
□ GET /api/discovery/jobs/:id - Get job status
□ Implement async job processing
□ Store discovered operations
□ Handle LLM errors gracefully
```

#### Day 13: Operations API
```
□ GET /api/projects/:id/operations - List operations
□ PATCH /api/operations/:id - Update operation (confirm/reject/edit)
□ POST /api/projects/:id/operations - Add manual operation
□ DELETE /api/operations/:id - Delete operation
```

#### Day 14: Frontend - Discovery
```
□ Create DiscoveryButton component
□ Create DiscoveryProgress component
□ Implement polling for job status
□ Show discovery results
```

#### Day 15: Frontend - Operations List
```
□ Create OperationsList component
□ Create OperationCard component
□ Implement confirm/reject actions
□ Implement edit operation modal
□ Implement add manual operation
```

### 3.3 Tests for Phase 3

#### Backend Unit Tests
```typescript
// tests/unit/llmClient.test.ts
describe('LLM Client', () => {
  test('should call Anthropic API with correct prompt', async () => {
    const mockResponse = { content: [{ text: '[]' }] };
    anthropicMock.messages.create.mockResolvedValue(mockResponse);

    await llmClient.discoverOperations('Test corpus content');

    expect(anthropicMock.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining('claude'),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' })
        ])
      })
    );
  });

  test('should parse operation discovery response', async () => {
    const mockResponse = {
      content: [{
        text: JSON.stringify([
          { name: 'Login', type: 'USER_INTERACTION', confidence: 0.9 }
        ])
      }]
    };
    anthropicMock.messages.create.mockResolvedValue(mockResponse);

    const operations = await llmClient.discoverOperations('User can login...');

    expect(operations).toHaveLength(1);
    expect(operations[0].name).toBe('Login');
  });

  test('should handle LLM errors', async () => {
    anthropicMock.messages.create.mockRejectedValue(new Error('API Error'));

    await expect(llmClient.discoverOperations('content'))
      .rejects.toThrow('API Error');
  });
});

// tests/unit/discoveryService.test.ts
describe('Discovery Service', () => {
  test('should create discovery job', async () => {
    const project = await createTestProject('Test');
    await uploadTestDocument(project.id, 'doc.txt', 'User logs in to system');

    const job = await discoveryService.startDiscovery(project.id);

    expect(job.id).toBeDefined();
    expect(job.status).toBe('PENDING');
  });

  test('should update job status during processing', async () => {
    const job = await discoveryService.startDiscovery(projectId);

    // Wait for processing
    await waitForJobComplete(job.id);

    const updatedJob = await discoveryService.getJob(job.id);
    expect(updatedJob.status).toBe('COMPLETED');
  });

  test('should store discovered operations', async () => {
    const mockOperations = [
      { name: 'Login', type: 'USER_INTERACTION', confidence: 0.9 }
    ];
    llmClientMock.discoverOperations.mockResolvedValue(mockOperations);

    const job = await discoveryService.startDiscovery(projectId);
    await waitForJobComplete(job.id);

    const operations = await db.getOperations(projectId);
    expect(operations).toHaveLength(1);
    expect(operations[0].name).toBe('Login');
  });
});

// tests/unit/operations.test.ts
describe('Operations API', () => {
  test('should list operations for project', async () => {
    const project = await createTestProjectWithOperations();

    const response = await request(app)
      .get(`/api/projects/${project.id}/operations`);

    expect(response.status).toBe(200);
    expect(response.body.operations.length).toBeGreaterThan(0);
  });

  test('should update operation status', async () => {
    const operation = await createTestOperation();

    const response = await request(app)
      .patch(`/api/operations/${operation.id}`)
      .send({ status: 'CONFIRMED' });

    expect(response.status).toBe(200);
    expect(response.body.operation.status).toBe('CONFIRMED');
  });

  test('should add manual operation', async () => {
    const project = await createTestProject('Test');

    const response = await request(app)
      .post(`/api/projects/${project.id}/operations`)
      .send({
        name: 'Manual Operation',
        description: 'Added by user',
        type: 'CLIENT_OPERATION'
      });

    expect(response.status).toBe(201);
    expect(response.body.operation.status).toBe('MANUAL');
  });
});
```

#### Frontend Unit Tests
```typescript
// tests/unit/DiscoveryButton.test.tsx
describe('DiscoveryButton', () => {
  test('should trigger discovery on click', async () => {
    const onDiscover = vi.fn().mockResolvedValue({ jobId: '123' });
    render(<DiscoveryButton projectId="p1" onDiscover={onDiscover} />);

    await userEvent.click(screen.getByRole('button', { name: /discover/i }));

    expect(onDiscover).toHaveBeenCalledWith('p1');
  });

  test('should show loading state during discovery', async () => {
    const onDiscover = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<DiscoveryButton projectId="p1" onDiscover={onDiscover} />);

    await userEvent.click(screen.getByRole('button', { name: /discover/i }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/discovering/i)).toBeInTheDocument();
  });
});

// tests/unit/OperationCard.test.tsx
describe('OperationCard', () => {
  const mockOperation = {
    id: '1',
    name: 'User Login',
    description: 'User logs into the system',
    type: 'USER_INTERACTION',
    status: 'DISCOVERED',
    confidence: 0.9
  };

  test('should display operation details', () => {
    render(<OperationCard operation={mockOperation} />);

    expect(screen.getByText('User Login')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  test('should call onConfirm when confirm clicked', async () => {
    const onConfirm = vi.fn();
    render(<OperationCard operation={mockOperation} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledWith('1');
  });

  test('should call onReject when reject clicked', async () => {
    const onReject = vi.fn();
    render(<OperationCard operation={mockOperation} onReject={onReject} />);

    await userEvent.click(screen.getByRole('button', { name: /reject/i }));

    expect(onReject).toHaveBeenCalledWith('1');
  });
});
```

#### Playwright E2E Tests
```typescript
// e2e/discovery.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Operation Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await setupProjectWithDocuments(page);
  });

  test('should start discovery process', async ({ page }) => {
    await page.goto('/projects/test-project');

    await page.click('button:has-text("Discover Operations")');

    await expect(page.locator('.discovery-progress')).toBeVisible();
    await expect(page.locator('text=Discovering operations')).toBeVisible();
  });

  test('should display discovered operations', async ({ page }) => {
    await page.goto('/projects/test-project');
    await page.click('button:has-text("Discover Operations")');

    // Wait for discovery to complete (with timeout)
    await expect(page.locator('.operations-list')).toBeVisible({ timeout: 60000 });

    // Should have at least one operation
    await expect(page.locator('.operation-card')).toHaveCount.greaterThan(0);
  });

  test('should confirm an operation', async ({ page }) => {
    await runDiscovery(page);

    const operationCard = page.locator('.operation-card').first();
    await operationCard.locator('button:has-text("Confirm")').click();

    await expect(operationCard.locator('.status-badge')).toHaveText('Confirmed');
  });

  test('should reject an operation', async ({ page }) => {
    await runDiscovery(page);

    const operationCard = page.locator('.operation-card').first();
    await operationCard.locator('button:has-text("Reject")').click();

    await expect(operationCard).toHaveClass(/rejected/);
  });

  test('should edit an operation', async ({ page }) => {
    await runDiscovery(page);

    const operationCard = page.locator('.operation-card').first();
    await operationCard.locator('button:has-text("Edit")').click();

    await expect(page.locator('.edit-modal')).toBeVisible();
    await page.fill('input[name="name"]', 'Updated Operation Name');
    await page.click('button:has-text("Save")');

    await expect(operationCard.locator('.operation-name')).toHaveText('Updated Operation Name');
  });

  test('should add manual operation', async ({ page }) => {
    await page.goto('/projects/test-project/operations');

    await page.click('button:has-text("Add Operation")');
    await page.fill('input[name="name"]', 'Manual Operation');
    await page.fill('textarea[name="description"]', 'Added manually');
    await page.selectOption('select[name="type"]', 'CLIENT_OPERATION');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Manual Operation')).toBeVisible();
    await expect(page.locator('.operation-card:has-text("Manual Operation") .status-badge'))
      .toHaveText('Manual');
  });
});
```

### 3.4 Deliverables
- [ ] LLM integration working
- [ ] Discovery job system complete
- [ ] Operations CRUD API
- [ ] Discovery UI with progress
- [ ] Operations list with actions
- [ ] All Phase 3 tests passing

---

## Phase 4: Diagram Data Layer (Days 16-20)

### 4.1 Objectives
- Implement diagram generation API
- Build detail extraction engine
- Create diagram data structures

### 4.2 Tasks

#### Day 16: Diagram API - Create & Read
```
□ POST /api/projects/:projectId/operations/:opId/diagrams - Generate diagram
□ GET /api/diagrams/:id - Get diagram with components
□ GET /api/projects/:projectId/operations/:opId/diagrams - List diagrams
□ Implement diagram job queue
```

#### Day 17: Detail Extraction Engine
```
□ Create extraction prompt templates
□ Implement component-specific extraction
□ Parse and store component details
□ Handle greyed-out components (no data found)
□ Store source references
```

#### Day 18: Diagram Components & Edges
```
□ Create fixed template component definitions
□ Calculate initial positions
□ Create edge definitions for flow
□ Store component positions
□ Store edge connections
```

#### Day 19: Diagram Update API
```
□ PUT /api/diagrams/:id - Save diagram modifications
□ PATCH /api/diagrams/:id/components/:compId - Update component
□ POST /api/diagrams/:id/components/:compId/reset - Reset to original
□ Track modification status
```

#### Day 20: Diagram Export API
```
□ POST /api/diagrams/:id/export - Export diagram
□ Implement JSON export
□ Prepare data structure for image export
```

### 4.3 Tests for Phase 4

#### Backend Unit Tests
```typescript
// tests/unit/diagramService.test.ts
describe('Diagram Service', () => {
  test('should create diagram for operation', async () => {
    const operation = await createTestOperation();

    const diagram = await diagramService.createDiagram(operation.id);

    expect(diagram.id).toBeDefined();
    expect(diagram.operationId).toBe(operation.id);
    expect(diagram.status).toBe('PENDING');
  });

  test('should generate all template components', async () => {
    const diagram = await createAndGenerateDiagram();

    const components = await db.getDiagramComponents(diagram.id);

    expect(components.length).toBe(11); // All template components
    expect(components.map(c => c.componentType)).toContain('USER_ACTION');
    expect(components.map(c => c.componentType)).toContain('DATABASE');
  });

  test('should mark components as greyed out when no data found', async () => {
    llmMock.extractDetails.mockResolvedValue({ found: false });

    const diagram = await createAndGenerateDiagram();
    const components = await db.getDiagramComponents(diagram.id);

    const firewallComponent = components.find(c => c.componentType === 'FIREWALL');
    expect(firewallComponent.status).toBe('GREYED_OUT');
  });
});

// tests/unit/extractionEngine.test.ts
describe('Extraction Engine', () => {
  test('should extract details for each component type', async () => {
    const mockExtraction = {
      USER_ACTION: { found: true, title: 'Click Login', confidence: 0.9 },
      CLIENT_CODE: { found: true, title: 'LoginHandler', confidence: 0.85 }
    };
    llmMock.extractAllDetails.mockResolvedValue(mockExtraction);

    const results = await extractionEngine.extractAll(operation, documents);

    expect(results.USER_ACTION.title).toBe('Click Login');
    expect(results.CLIENT_CODE.title).toBe('LoginHandler');
  });

  test('should include source excerpts', async () => {
    const mockExtraction = {
      API_ENDPOINT: {
        found: true,
        title: 'POST /api/login',
        sourceExcerpt: 'The login endpoint accepts...'
      }
    };
    llmMock.extractAllDetails.mockResolvedValue(mockExtraction);

    const results = await extractionEngine.extractAll(operation, documents);

    expect(results.API_ENDPOINT.sourceExcerpt).toContain('login endpoint');
  });
});

// tests/unit/diagramApi.test.ts
describe('Diagram API', () => {
  test('should return diagram with components and edges', async () => {
    const diagram = await createCompleteDiagram();

    const response = await request(app).get(`/api/diagrams/${diagram.id}`);

    expect(response.status).toBe(200);
    expect(response.body.diagram).toBeDefined();
    expect(response.body.components).toHaveLength(11);
    expect(response.body.edges.length).toBeGreaterThan(0);
  });

  test('should save component modifications', async () => {
    const diagram = await createCompleteDiagram();
    const component = diagram.components[0];

    const response = await request(app)
      .patch(`/api/diagrams/${diagram.id}/components/${component.id}`)
      .send({
        title: 'Updated Title',
        position: { x: 100, y: 200 }
      });

    expect(response.status).toBe(200);
    expect(response.body.component.title).toBe('Updated Title');
    expect(response.body.component.isUserModified).toBe(true);
  });

  test('should reset component to original', async () => {
    const diagram = await createCompleteDiagram();
    const component = await modifyComponent(diagram.components[0].id);

    const response = await request(app)
      .post(`/api/diagrams/${diagram.id}/components/${component.id}/reset`);

    expect(response.status).toBe(200);
    expect(response.body.component.title).toBe(component.originalTitle);
    expect(response.body.component.isUserModified).toBe(false);
  });
});
```

### 4.4 Deliverables
- [ ] Diagram generation API
- [ ] Detail extraction engine
- [ ] Component and edge management
- [ ] Diagram save/update API
- [ ] All Phase 4 tests passing

---

## Phase 5: ReactFlow Integration (Days 21-25)

### 5.1 Objectives
- Set up ReactFlow
- Create custom node components
- Implement diagram rendering

### 5.2 Tasks

#### Day 21: ReactFlow Setup
```
□ Install and configure ReactFlow
□ Create DiagramCanvas wrapper component
□ Set up viewport controls
□ Configure zoom and pan
□ Add MiniMap and Background
```

#### Day 22: Custom Node Components
```
□ Create BaseNode component
□ Create UserActionNode
□ Create ClientCodeNode
□ Create ApiEndpointNode
□ Create BackendLogicNode
□ Create DatabaseNode
□ Create EventHandlerNode
□ Create ViewUpdateNode
```

#### Day 23: Security Layer Group
```
□ Create SecurityGroupNode (container)
□ Create FirewallNode
□ Create WAFNode
□ Create LoadBalancerNode
□ Create ApiGatewayNode
□ Style security layer container
```

#### Day 24: Edges and Connections
```
□ Create RequestEdge (solid line)
□ Create ResponseEdge (dashed line)
□ Configure edge routing
□ Add edge labels
□ Style animated edges
```

#### Day 25: Data Transformation
```
□ Create API → ReactFlow transformer
□ Create ReactFlow → API transformer
□ Handle viewport state
□ Handle position updates
□ Wire up diagram loading
```

### 5.3 Tests for Phase 5

#### Frontend Unit Tests
```typescript
// tests/unit/DiagramCanvas.test.tsx
describe('DiagramCanvas', () => {
  const mockDiagramData = createMockDiagramData();

  test('should render ReactFlow canvas', () => {
    render(<DiagramCanvas data={mockDiagramData} />);

    expect(screen.getByTestId('reactflow-canvas')).toBeInTheDocument();
  });

  test('should render all nodes', () => {
    render(<DiagramCanvas data={mockDiagramData} />);

    expect(screen.getAllByTestId(/^node-/)).toHaveLength(11);
  });

  test('should render edges', () => {
    render(<DiagramCanvas data={mockDiagramData} />);

    expect(screen.getAllByTestId(/^edge-/)).toHaveLength(mockDiagramData.edges.length);
  });

  test('should display MiniMap', () => {
    render(<DiagramCanvas data={mockDiagramData} />);

    expect(screen.getByTestId('minimap')).toBeInTheDocument();
  });
});

// tests/unit/BaseNode.test.tsx
describe('BaseNode', () => {
  const mockNodeData = {
    title: 'Test Component',
    description: 'Test description',
    status: 'POPULATED',
    confidence: 0.85,
    sourceExcerpt: 'Source text...',
    isUserModified: false
  };

  test('should render node with title and description', () => {
    render(<BaseNode data={mockNodeData} />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  test('should show confidence badge', () => {
    render(<BaseNode data={mockNodeData} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('should show source badge when excerpt exists', () => {
    render(<BaseNode data={mockNodeData} />);

    expect(screen.getByTitle(/source/i)).toBeInTheDocument();
  });

  test('should show modified indicator when modified', () => {
    render(<BaseNode data={{ ...mockNodeData, isUserModified: true }} />);

    expect(screen.getByText('✎')).toBeInTheDocument();
  });

  test('should apply greyed out style', () => {
    render(<BaseNode data={{ ...mockNodeData, status: 'GREYED_OUT' }} />);

    expect(screen.getByTestId('node-container')).toHaveClass('greyed-out');
  });
});

// tests/unit/SecurityGroupNode.test.tsx
describe('SecurityGroupNode', () => {
  const mockSecurityData = {
    components: [
      { id: 'fw', title: 'Firewall', status: 'GREYED_OUT' },
      { id: 'waf', title: 'WAF', status: 'GREYED_OUT' },
      { id: 'lb', title: 'Load Balancer', status: 'GREYED_OUT' },
      { id: 'gw', title: 'API Gateway', status: 'POPULATED' }
    ]
  };

  test('should render all security sub-components', () => {
    render(<SecurityGroupNode data={mockSecurityData} />);

    expect(screen.getByText('Firewall')).toBeInTheDocument();
    expect(screen.getByText('WAF')).toBeInTheDocument();
    expect(screen.getByText('Load Balancer')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
  });

  test('should display Security Layer label', () => {
    render(<SecurityGroupNode data={mockSecurityData} />);

    expect(screen.getByText('Security Layer')).toBeInTheDocument();
  });
});

// tests/unit/diagramTransform.test.ts
describe('Diagram Transform', () => {
  test('should transform API data to ReactFlow nodes', () => {
    const apiData = createMockApiDiagramData();

    const { nodes, edges } = transformToReactFlow(apiData);

    expect(nodes).toHaveLength(apiData.components.length);
    expect(nodes[0].id).toBe(apiData.components[0].id);
    expect(nodes[0].position).toEqual(apiData.components[0].position);
  });

  test('should transform ReactFlow state back to API format', () => {
    const rfNodes = createMockReactFlowNodes();
    const rfEdges = createMockReactFlowEdges();

    const apiData = transformFromReactFlow('diagram-id', rfNodes, rfEdges, { x: 0, y: 0, zoom: 1 });

    expect(apiData.components).toHaveLength(rfNodes.length);
    expect(apiData.diagramId).toBe('diagram-id');
  });
});
```

#### Playwright E2E Tests
```typescript
// e2e/diagram-rendering.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Diagram Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await setupProjectWithDiagram(page);
  });

  test('should render diagram canvas', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('should render all component nodes', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    // Wait for nodes to render
    await expect(page.locator('.react-flow__node')).toHaveCount(11);
  });

  test('should render security layer group', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    await expect(page.locator('.security-group-node')).toBeVisible();
    await expect(page.locator('text=Security Layer')).toBeVisible();
  });

  test('should render edges between nodes', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    const edges = page.locator('.react-flow__edge');
    await expect(edges).toHaveCount.greaterThan(5);
  });

  test('should zoom with mouse wheel', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    const canvas = page.locator('.react-flow');
    const initialTransform = await canvas.locator('.react-flow__viewport').getAttribute('style');

    await canvas.hover();
    await page.mouse.wheel(0, -100);

    const newTransform = await canvas.locator('.react-flow__viewport').getAttribute('style');
    expect(newTransform).not.toBe(initialTransform);
  });

  test('should pan with mouse drag', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    const canvas = page.locator('.react-flow');
    const viewport = canvas.locator('.react-flow__viewport');
    const initialTransform = await viewport.getAttribute('style');

    await canvas.dragTo(canvas, {
      sourcePosition: { x: 200, y: 200 },
      targetPosition: { x: 400, y: 400 }
    });

    const newTransform = await viewport.getAttribute('style');
    expect(newTransform).not.toBe(initialTransform);
  });

  test('should display MiniMap', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    await expect(page.locator('.react-flow__minimap')).toBeVisible();
  });

  test('should display controls', async ({ page }) => {
    await page.goto('/diagrams/test-diagram');

    await expect(page.locator('.react-flow__controls')).toBeVisible();
    await expect(page.locator('button[title="zoom in"]')).toBeVisible();
    await expect(page.locator('button[title="zoom out"]')).toBeVisible();
  });
});
```

### 5.4 Deliverables
- [ ] ReactFlow canvas rendering
- [ ] All custom node components
- [ ] Security layer group
- [ ] Edge rendering
- [ ] Data transformation utilities
- [ ] All Phase 5 tests passing

---

## Phase 6: Diagram Editing & Saving (Days 26-30)

### 6.1 Objectives
- Implement node dragging
- Build edit modal
- Implement save functionality
- Add export features

### 6.2 Tasks

#### Day 26: Node Interaction
```
□ Enable node dragging
□ Track position changes
□ Implement node selection
□ Add selection highlighting
□ Handle multi-select (optional)
```

#### Day 27: Edit Modal
```
□ Create EditModal component
□ Implement title editing
□ Implement description editing
□ Show source reference
□ Implement reset to original
```

#### Day 28: Save Functionality
```
□ Create DiagramToolbar component
□ Implement save button
□ Track unsaved changes
□ Show unsaved indicator
□ Add Ctrl+S keyboard shortcut
□ Add beforeunload warning
```

#### Day 29: Auto-save & Reset
```
□ Implement auto-save (optional)
□ Add reset all button
□ Implement reset single component
□ Show modification indicators
□ Handle save errors
```

#### Day 30: Export Features
```
□ Install html-to-image
□ Implement PNG export
□ Implement SVG export
□ Implement JSON export
□ Create ExportMenu component
```

### 6.3 Tests for Phase 6

#### Frontend Unit Tests
```typescript
// tests/unit/EditModal.test.tsx
describe('EditModal', () => {
  const mockNode = {
    id: 'node-1',
    data: {
      title: 'Original Title',
      description: 'Original description',
      sourceExcerpt: 'Source text',
      isUserModified: false
    }
  };

  test('should display current values', () => {
    render(<EditModal node={mockNode} onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original description')).toBeInTheDocument();
  });

  test('should call onSave with updated values', async () => {
    const onSave = vi.fn();
    render(<EditModal node={mockNode} onSave={onSave} onCancel={vi.fn()} />);

    await userEvent.clear(screen.getByLabelText('Title'));
    await userEvent.type(screen.getByLabelText('Title'), 'New Title');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({ title: 'New Title', description: 'Original description' });
  });

  test('should call onCancel when cancelled', async () => {
    const onCancel = vi.fn();
    render(<EditModal node={mockNode} onSave={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  test('should show reset button when modified', () => {
    const modifiedNode = { ...mockNode, data: { ...mockNode.data, isUserModified: true } };
    render(<EditModal node={modifiedNode} onSave={vi.fn()} onCancel={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});

// tests/unit/DiagramToolbar.test.tsx
describe('DiagramToolbar', () => {
  test('should show save button', () => {
    render(<DiagramToolbar onSave={vi.fn()} hasUnsavedChanges={false} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  test('should indicate unsaved changes', () => {
    render(<DiagramToolbar onSave={vi.fn()} hasUnsavedChanges={true} />);

    expect(screen.getByText(/unsaved/i)).toBeInTheDocument();
  });

  test('should disable save when saving', () => {
    render(<DiagramToolbar onSave={vi.fn()} isSaving={true} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  test('should call onSave when clicked', async () => {
    const onSave = vi.fn();
    render(<DiagramToolbar onSave={onSave} hasUnsavedChanges={true} />);

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalled();
  });
});

// tests/unit/exportDiagram.test.ts
describe('Export Diagram', () => {
  test('should export to JSON', () => {
    const state = createMockDiagramState();

    const json = exportToJson(state);
    const parsed = JSON.parse(json);

    expect(parsed.diagram.id).toBe(state.diagram.id);
    expect(parsed.components).toHaveLength(state.components.length);
  });
});
```

#### Playwright E2E Tests
```typescript
// e2e/diagram-editing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Diagram Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupProjectWithDiagram(page);
    await page.goto('/diagrams/test-diagram');
  });

  test('should drag node to new position', async ({ page }) => {
    const node = page.locator('.react-flow__node').first();
    const initialPosition = await node.boundingBox();

    await node.dragTo(page.locator('.react-flow'), {
      targetPosition: { x: initialPosition!.x + 100, y: initialPosition!.y + 50 }
    });

    // Check unsaved indicator appears
    await expect(page.locator('text=Unsaved')).toBeVisible();
  });

  test('should open edit modal on node click', async ({ page }) => {
    await page.locator('.react-flow__node').first().click();
    await page.locator('.edit-btn').click();

    await expect(page.locator('.edit-modal')).toBeVisible();
  });

  test('should edit node title', async ({ page }) => {
    await page.locator('.react-flow__node').first().click();
    await page.locator('.edit-btn').click();

    await page.fill('input[name="title"]', 'Updated Node Title');
    await page.click('button:has-text("Save")');

    await expect(page.locator('.react-flow__node').first()).toContainText('Updated Node Title');
  });

  test('should save diagram', async ({ page }) => {
    // Make a change
    const node = page.locator('.react-flow__node').first();
    await node.dragTo(page.locator('.react-flow'), {
      targetPosition: { x: 500, y: 300 }
    });

    // Save
    await page.click('button:has-text("Save")');

    // Wait for save to complete
    await expect(page.locator('text=Saved')).toBeVisible();
    await expect(page.locator('text=Unsaved')).not.toBeVisible();
  });

  test('should save with Ctrl+S', async ({ page }) => {
    // Make a change
    const node = page.locator('.react-flow__node').first();
    await node.dragTo(page.locator('.react-flow'), {
      targetPosition: { x: 500, y: 300 }
    });

    // Save with keyboard
    await page.keyboard.press('Control+s');

    await expect(page.locator('text=Saved')).toBeVisible();
  });

  test('should warn before leaving with unsaved changes', async ({ page }) => {
    // Make a change
    const node = page.locator('.react-flow__node').first();
    await node.dragTo(page.locator('.react-flow'), {
      targetPosition: { x: 500, y: 300 }
    });

    // Try to navigate away
    page.on('dialog', dialog => {
      expect(dialog.type()).toBe('beforeunload');
      dialog.dismiss();
    });

    await page.goto('/');
  });

  test('should reset node to original', async ({ page }) => {
    // Edit node
    await page.locator('.react-flow__node').first().click();
    await page.locator('.edit-btn').click();
    await page.fill('input[name="title"]', 'Modified Title');
    await page.click('button:has-text("Save")');

    // Reset
    await page.locator('.react-flow__node').first().click();
    await page.locator('.edit-btn').click();
    await page.click('button:has-text("Reset")');

    // Should be back to original
    await expect(page.locator('.react-flow__node').first()).not.toContainText('Modified Title');
  });

  test('should export diagram as PNG', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.click('button:has-text("Export")');
    await page.click('text=PNG');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('should export diagram as JSON', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.click('button:has-text("Export")');
    await page.click('text=JSON');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});
```

### 6.4 Deliverables
- [ ] Node dragging and repositioning
- [ ] Edit modal with save/cancel
- [ ] Save functionality with indicators
- [ ] Keyboard shortcuts
- [ ] Export to PNG/SVG/JSON
- [ ] All Phase 6 tests passing

---

## Phase 7: Validation Engine (Days 31-35)

### 7.1 Objectives
- Build validation service
- Implement comparison logic
- Create validation API

### 7.2 Tasks

#### Day 31: Validation Data Model
```
□ Create validation_runs table
□ Create validation_results table
□ Create document_versions table
□ Define validation status types
□ Define discrepancy types
```

#### Day 32: Validation API
```
□ POST /api/diagrams/:id/validate - Trigger validation
□ GET /api/validations/:id/status - Get status
□ GET /api/validations/:id - Get full report
□ GET /api/diagrams/:id/validations - Get history
```

#### Day 33: Validation Engine Core
```
□ Create validation service structure
□ Implement staleness detection
□ Create validation prompt
□ Implement LLM comparison call
□ Parse validation response
```

#### Day 34: Discrepancy Detection
```
□ Implement content mismatch detection
□ Implement missing data detection
□ Implement conflicting sources detection
□ Calculate severity levels
□ Generate suggested fixes
```

#### Day 35: Validation Scoring
```
□ Implement validation score calculation
□ Aggregate component results
□ Generate validation summary
□ Store validation results
□ Update diagram validation status
```

### 7.3 Tests for Phase 7

#### Backend Unit Tests
```typescript
// tests/unit/validationService.test.ts
describe('Validation Service', () => {
  test('should create validation run', async () => {
    const diagram = await createCompleteDiagram();

    const runId = await validationService.startValidation(diagram.id);

    expect(runId).toBeDefined();
    const run = await db.getValidationRun(runId);
    expect(run.status).toBe('PENDING');
  });

  test('should validate all components', async () => {
    const diagram = await createCompleteDiagram();
    llmMock.validateComponent.mockResolvedValue({
      overallStatus: 'VALID',
      discrepancies: [],
      confidence: 0.95
    });

    const runId = await validationService.startValidation(diagram.id);
    await waitForValidationComplete(runId);

    const results = await db.getValidationResults(runId);
    expect(results).toHaveLength(11);
  });

  test('should detect discrepancies', async () => {
    const diagram = await createCompleteDiagram();
    llmMock.validateComponent.mockResolvedValue({
      overallStatus: 'INVALID',
      discrepancies: [{
        type: 'CONTENT_MISMATCH',
        severity: 'MAJOR',
        field: 'title',
        diagramValue: 'Old value',
        corpusValue: 'New value'
      }],
      confidence: 0.9
    });

    const runId = await validationService.startValidation(diagram.id);
    await waitForValidationComplete(runId);

    const results = await db.getValidationResults(runId);
    expect(results[0].discrepancies).toHaveLength(1);
    expect(results[0].status).toBe('INVALID');
  });

  test('should calculate validation score', async () => {
    const results = [
      { status: 'VALID' },
      { status: 'VALID' },
      { status: 'WARNING' },
      { status: 'INVALID' }
    ];

    const score = validationService.calculateScore(results);

    expect(score).toBe(63); // (2 + 0.5) / 4 * 100 = 62.5, rounded
  });

  test('should detect stale components', async () => {
    const diagram = await createCompleteDiagram();
    // Update source document after diagram was created
    await updateDocument(diagram.sourceDocumentId, 'Updated content');

    const runId = await validationService.startValidation(diagram.id);
    await waitForValidationComplete(runId);

    const results = await db.getValidationResults(runId);
    const staleResults = results.filter(r => r.status === 'STALE');
    expect(staleResults.length).toBeGreaterThan(0);
  });
});

// tests/unit/validationApi.test.ts
describe('Validation API', () => {
  test('should start validation', async () => {
    const diagram = await createCompleteDiagram();

    const response = await request(app)
      .post(`/api/diagrams/${diagram.id}/validate`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.validationRunId).toBeDefined();
    expect(response.body.status).toBe('RUNNING');
  });

  test('should return validation status', async () => {
    const runId = await startValidation(diagramId);

    const response = await request(app)
      .get(`/api/validations/${runId}/status`);

    expect(response.status).toBe(200);
    expect(['RUNNING', 'COMPLETED']).toContain(response.body.status);
  });

  test('should return full validation report', async () => {
    const runId = await startAndCompleteValidation(diagramId);

    const response = await request(app)
      .get(`/api/validations/${runId}`);

    expect(response.status).toBe(200);
    expect(response.body.report.summary).toBeDefined();
    expect(response.body.report.results).toHaveLength(11);
  });

  test('should return validation history', async () => {
    await startAndCompleteValidation(diagramId);
    await startAndCompleteValidation(diagramId);

    const response = await request(app)
      .get(`/api/diagrams/${diagramId}/validations`);

    expect(response.status).toBe(200);
    expect(response.body.validations).toHaveLength(2);
  });
});
```

### 7.4 Deliverables
- [ ] Validation database tables
- [ ] Validation API endpoints
- [ ] Validation engine core
- [ ] Discrepancy detection
- [ ] Score calculation
- [ ] All Phase 7 tests passing

---

## Phase 8: Validation UI & Reports (Days 36-38)

### 8.1 Objectives
- Build validation trigger UI
- Create validation badges
- Build validation report view

### 8.2 Tasks

#### Day 36: Validation Trigger UI
```
□ Add Validate button to toolbar
□ Create ValidationProgress component
□ Implement polling for status
□ Handle validation errors
□ Show completion notification
```

#### Day 37: Validation Badges
```
□ Create ValidationBadge component
□ Update BaseNode with validation status
□ Style validation states (valid, warning, invalid, etc.)
□ Add click handler to show details
□ Update diagram after validation
```

#### Day 38: Validation Report View
```
□ Create ValidationReport component
□ Create ValidationSummary component
□ Create DiscrepancyList component
□ Create DiscrepancyCard component
□ Implement "Go to Component" navigation
□ Create ValidationHistory component
```

### 8.3 Tests for Phase 8

#### Frontend Unit Tests
```typescript
// tests/unit/ValidationBadge.test.tsx
describe('ValidationBadge', () => {
  test.each([
    ['VALID', '✅'],
    ['WARNING', '⚠️'],
    ['INVALID', '❌'],
    ['UNVERIFIABLE', '❓'],
    ['STALE', '🔄']
  ])('should show correct icon for %s status', (status, expectedIcon) => {
    render(<ValidationBadge status={status} />);

    expect(screen.getByText(expectedIcon)).toBeInTheDocument();
  });

  test('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ValidationBadge status="INVALID" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalled();
  });
});

// tests/unit/ValidationReport.test.tsx
describe('ValidationReport', () => {
  const mockReport = createMockValidationReport();

  test('should display validation score', () => {
    render(<ValidationReport report={mockReport} />);

    expect(screen.getByText('82')).toBeInTheDocument();
  });

  test('should display summary counts', () => {
    render(<ValidationReport report={mockReport} />);

    expect(screen.getByText(/7.*valid/i)).toBeInTheDocument();
    expect(screen.getByText(/2.*warning/i)).toBeInTheDocument();
    expect(screen.getByText(/1.*invalid/i)).toBeInTheDocument();
  });

  test('should list discrepancies', () => {
    render(<ValidationReport report={mockReport} />);

    expect(screen.getByText(/issues found/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('discrepancy-card')).toHaveLength(3);
  });

  test('should call onComponentClick when clicking Go to Component', async () => {
    const onComponentClick = vi.fn();
    render(<ValidationReport report={mockReport} onComponentClick={onComponentClick} />);

    await userEvent.click(screen.getAllByRole('button', { name: /go to component/i })[0]);

    expect(onComponentClick).toHaveBeenCalled();
  });
});

// tests/unit/DiscrepancyCard.test.tsx
describe('DiscrepancyCard', () => {
  const mockResult = createMockComponentValidationResult();

  test('should display component type', () => {
    render(<DiscrepancyCard result={mockResult} />);

    expect(screen.getByText('API_ENDPOINT')).toBeInTheDocument();
  });

  test('should display diagram vs corpus values', () => {
    render(<DiscrepancyCard result={mockResult} />);

    expect(screen.getByText('/api/cart/items')).toBeInTheDocument();
    expect(screen.getByText('/api/v2/cart/items')).toBeInTheDocument();
  });

  test('should display suggested fix', () => {
    render(<DiscrepancyCard result={mockResult} />);

    expect(screen.getByText(/suggested fix/i)).toBeInTheDocument();
  });

  test('should display source reference', () => {
    render(<DiscrepancyCard result={mockResult} />);

    expect(screen.getByText(/api-docs.md/)).toBeInTheDocument();
  });
});
```

#### Playwright E2E Tests
```typescript
// e2e/validation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Diagram Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupProjectWithDiagram(page);
    await page.goto('/diagrams/test-diagram');
  });

  test('should trigger validation', async ({ page }) => {
    await page.click('button:has-text("Validate")');

    await expect(page.locator('.validation-progress')).toBeVisible();
    await expect(page.locator('text=Validating')).toBeVisible();
  });

  test('should show validation progress', async ({ page }) => {
    await page.click('button:has-text("Validate")');

    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('text=/\\d+\\/11/')).toBeVisible();
  });

  test('should display validation badges on nodes after completion', async ({ page }) => {
    await page.click('button:has-text("Validate")');

    // Wait for validation to complete
    await expect(page.locator('text=Validation complete')).toBeVisible({ timeout: 120000 });

    // Check that badges appear
    await expect(page.locator('.validation-badge')).toHaveCount.greaterThan(0);
  });

  test('should open validation report', async ({ page }) => {
    await runValidation(page);

    await page.click('button:has-text("View Report")');

    await expect(page.locator('.validation-report')).toBeVisible();
  });

  test('should display validation score', async ({ page }) => {
    await runValidation(page);
    await page.click('button:has-text("View Report")');

    await expect(page.locator('.validation-score')).toBeVisible();
    await expect(page.locator('.validation-score')).toContainText(/\d+/);
  });

  test('should display discrepancy details', async ({ page }) => {
    await runValidation(page);
    await page.click('button:has-text("View Report")');

    // Find and expand a discrepancy
    const discrepancyCard = page.locator('.discrepancy-card').first();
    await expect(discrepancyCard).toBeVisible();

    // Check it shows diagram vs corpus comparison
    await expect(discrepancyCard.locator('text=Diagram says')).toBeVisible();
    await expect(discrepancyCard.locator('text=Corpus says')).toBeVisible();
  });

  test('should navigate to component from report', async ({ page }) => {
    await runValidation(page);
    await page.click('button:has-text("View Report")');

    // Click Go to Component
    await page.locator('.discrepancy-card').first().locator('button:has-text("Go to Component")').click();

    // Report should close and node should be selected
    await expect(page.locator('.validation-report')).not.toBeVisible();
    await expect(page.locator('.react-flow__node.selected')).toBeVisible();
  });

  test('should show validation history', async ({ page }) => {
    // Run validation twice
    await runValidation(page);
    await runValidation(page);

    await page.click('button:has-text("History")');

    await expect(page.locator('.validation-history')).toBeVisible();
    await expect(page.locator('.validation-history-item')).toHaveCount(2);
  });

  test('should click badge to show component validation detail', async ({ page }) => {
    await runValidation(page);

    await page.locator('.validation-badge').first().click();

    await expect(page.locator('.component-validation-detail')).toBeVisible();
  });
});

// Helper function
async function runValidation(page) {
  await page.click('button:has-text("Validate")');
  await expect(page.locator('text=Validation complete')).toBeVisible({ timeout: 120000 });
}
```

### 8.4 Deliverables
- [ ] Validation trigger UI
- [ ] Validation badges on nodes
- [ ] Validation report view
- [ ] Discrepancy details display
- [ ] Navigation from report to component
- [ ] Validation history
- [ ] All Phase 8 tests passing

---

## Phase 9: Polish, Integration & E2E (Days 39-40)

### 9.1 Objectives
- Full integration testing
- Performance optimization
- Bug fixes and polish
- Documentation

### 9.2 Tasks

#### Day 39: Integration & E2E Testing
```
□ Run full E2E test suite
□ Fix any failing tests
□ Test edge cases
□ Test error scenarios
□ Performance testing
```

#### Day 40: Polish & Documentation
```
□ UI polish and consistency
□ Error message improvements
□ Loading state improvements
□ Add user documentation
□ Add API documentation
□ Deployment preparation
```

### 9.3 Full E2E Test Suite

```typescript
// e2e/full-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('should complete full MVP1 → MVP2 → MVP3 flow', async ({ page }) => {
    // ========== MVP1: Operation Discovery ==========

    // Create project
    await page.goto('/');
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="projectName"]', 'E2E Complete Flow');
    await page.click('button:has-text("Create")');

    // Upload documents
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'api-docs.md', mimeType: 'text/markdown', buffer: Buffer.from(API_DOCS_CONTENT) },
      { name: 'architecture.md', mimeType: 'text/markdown', buffer: Buffer.from(ARCH_CONTENT) }
    ]);
    await expect(page.locator('.document-card')).toHaveCount(2);

    // Run discovery
    await page.click('button:has-text("Discover Operations")');
    await expect(page.locator('.operations-list')).toBeVisible({ timeout: 60000 });

    // Confirm an operation
    const operationCard = page.locator('.operation-card').first();
    await operationCard.locator('button:has-text("Confirm")').click();
    await expect(operationCard.locator('.status-badge')).toHaveText('Confirmed');

    // ========== MVP2: Diagram Generation & Editing ==========

    // Generate diagram
    await operationCard.locator('button:has-text("Generate Diagram")').click();
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 90000 });

    // Verify nodes rendered
    await expect(page.locator('.react-flow__node')).toHaveCount(11);

    // Edit a node
    await page.locator('.react-flow__node').first().click();
    await page.locator('.edit-btn').click();
    await page.fill('input[name="title"]', 'Updated Component');
    await page.click('button:has-text("Save")');

    // Drag a node
    const node = page.locator('.react-flow__node').nth(1);
    await node.dragTo(page.locator('.react-flow'), {
      targetPosition: { x: 600, y: 300 }
    });

    // Save diagram
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Saved')).toBeVisible();

    // ========== MVP3: Validation ==========

    // Run validation
    await page.click('button:has-text("Validate")');
    await expect(page.locator('text=Validation complete')).toBeVisible({ timeout: 120000 });

    // Check validation badges appear
    await expect(page.locator('.validation-badge')).toHaveCount.greaterThan(0);

    // View report
    await page.click('button:has-text("View Report")');
    await expect(page.locator('.validation-report')).toBeVisible();
    await expect(page.locator('.validation-score')).toContainText(/\d+/);

    // Navigate to component from report
    const hasDiscrepancies = await page.locator('.discrepancy-card').count() > 0;
    if (hasDiscrepancies) {
      await page.locator('.discrepancy-card').first().locator('button:has-text("Go to Component")').click();
      await expect(page.locator('.react-flow__node.selected')).toBeVisible();
    }

    // Export diagram
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('text=PNG');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);

    console.log('✅ Complete E2E flow passed!');
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/');

    // Test 404 handling
    await page.goto('/diagrams/non-existent');
    await expect(page.locator('text=/not found/i')).toBeVisible();

    // Test API error handling
    await page.route('**/api/projects', route => route.abort());
    await page.goto('/');
    await expect(page.locator('text=/error|failed/i')).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });
});

// e2e/performance.spec.ts
test.describe('Performance', () => {
  test('should load diagram within acceptable time', async ({ page }) => {
    await setupProjectWithDiagram(page);

    const startTime = Date.now();
    await page.goto('/diagrams/test-diagram');
    await expect(page.locator('.react-flow__node')).toHaveCount(11);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // 3 seconds max
  });

  test('should handle large document upload', async ({ page }) => {
    await setupProject(page);

    // Create a 1MB document
    const largeContent = 'A'.repeat(1024 * 1024);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent)
    });

    await expect(page.locator('text=large-doc.txt')).toBeVisible({ timeout: 30000 });
  });
});
```

### 9.4 Test Coverage Requirements

| Area | Unit Test Coverage | E2E Coverage |
|------|-------------------|--------------|
| API Endpoints | > 90% | All critical paths |
| Services | > 85% | N/A |
| React Components | > 80% | Key interactions |
| Utilities | > 95% | N/A |

### 9.5 Deliverables
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] Error handling verified
- [ ] Documentation complete
- [ ] Ready for deployment

---

## Test Summary by Phase

| Phase | Unit Tests | Integration Tests | E2E Tests |
|-------|------------|-------------------|-----------|
| 1 - Foundation | 10 | 2 | 3 |
| 2 - Documents | 15 | 5 | 5 |
| 3 - Discovery | 20 | 8 | 6 |
| 4 - Diagram Data | 18 | 6 | 0 |
| 5 - ReactFlow | 15 | 0 | 7 |
| 6 - Editing | 12 | 4 | 10 |
| 7 - Validation Engine | 15 | 6 | 0 |
| 8 - Validation UI | 12 | 3 | 8 |
| 9 - Integration | 0 | 0 | 5 |
| **Total** | **117** | **34** | **44** |

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run unit tests
        run: cd backend && npm test
      - name: Run integration tests
        run: cd backend && npm run test:integration

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run unit tests
        run: cd frontend && npm test
      - name: Build
        run: cd frontend && npm run build

  test-e2e:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start services
        run: npm run start:test &
      - name: Wait for services
        run: npx wait-on http://localhost:3000 http://localhost:5173
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM API rate limits | Implement retry with backoff, queue system |
| LLM API costs | Use Haiku for cost efficiency, cache responses |
| Large file uploads | Implement chunking, progress feedback |
| Browser memory (ReactFlow) | Lazy loading, virtualization if needed |
| Test flakiness | Proper waits, retry logic, isolated tests |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Unit test coverage | > 80% |
| E2E test pass rate | 100% |
| Page load time | < 2s |
| Discovery time | < 60s |
| Diagram generation | < 90s |
| Validation time | < 120s |
| LLM cost per operation | < $0.05 |

---

*Document Version: 1.0*
*Total Duration: 8 weeks (40 working days)*
*Team Size: 2-3 developers*
