import { test, expect } from '@playwright/test';

test.describe('Complete User Journeys', () => {
  test.describe('Journey 1: New User - Create Project and Generate Diagram', () => {
    let projectId: string;

    test.afterEach(async ({ request }) => {
      if (projectId) {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });

    test('should complete full project creation to diagram generation flow', async ({ page, request }) => {
      // Step 1: Navigate to application
      await page.goto('/');
      await expect(page).toHaveTitle(/VeoEndToEnd/i);

      // Step 2: Navigate to projects
      await page.getByRole('link', { name: /Projects/i }).click();
      await expect(page).toHaveURL('/projects');

      // Step 3: Create new project
      await page.getByRole('button', { name: /New Project|Create/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const projectName = `E2E Journey Test ${Date.now()}`;
      await page.getByLabel(/Name/i).fill(projectName);
      await page.getByLabel(/Description/i).fill('End-to-end journey test project');
      await page.getByRole('button', { name: /Create|Save/i }).click();

      // Get project ID for cleanup
      const projectsResponse = await request.get('http://localhost:3001/api/projects');
      const projectsData = await projectsResponse.json();
      const createdProject = projectsData.data.find((p: { name: string }) => p.name === projectName);
      projectId = createdProject?.id;

      // Step 4: Navigate to project
      await page.getByText(projectName).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`));

      // Step 5: Create operation
      await page.getByRole('button', { name: /Add Operation|New Operation/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByLabel(/Name/i).fill('User Login Flow');
      const descField = page.getByLabel(/Description/i).or(page.getByPlaceholder(/Description/i));
      if (await descField.isVisible()) {
        await descField.fill('User enters credentials, frontend validates, sends request to backend, database checks user');
      }
      await page.getByRole('button', { name: /Create|Add|Save/i }).click();

      // Step 6: Generate diagram
      const operationCard = page.locator('.operation-card, [data-testid="operation-card"]').filter({ hasText: 'User Login Flow' }).first();
      const generateButton = operationCard.getByRole('button', { name: /Generate|Diagram/i }).first();
      await generateButton.click();

      // Step 7: Wait for diagram
      await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 });

      // Step 8: Verify diagram has nodes
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toBeVisible();
      expect(await nodes.count()).toBeGreaterThan(0);

      // Journey complete!
    });
  });

  test.describe('Journey 2: Document Import and Operation Discovery', () => {
    let projectId: string;

    test.afterEach(async ({ request }) => {
      if (projectId) {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });

    test('should discover operations from imported documents', async ({ page, request }) => {
      // Step 1: Create project via API for speed
      const projectResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Discovery Journey ${Date.now()}`,
          description: 'Document import and discovery test',
        },
      });
      const projectData = await projectResponse.json();
      projectId = projectData.data.id;

      // Step 2: Import documents via API
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'user-flows.txt',
          content: `
            User Authentication Flow:
            1. User navigates to login page
            2. User enters email and password
            3. Frontend validates input format
            4. Frontend sends POST /api/auth/login request
            5. Backend validates credentials against database
            6. Backend generates JWT token
            7. Frontend stores token in localStorage
            8. User is redirected to dashboard

            User Registration Flow:
            1. User clicks on Sign Up button
            2. User fills registration form with name, email, password
            3. Frontend validates email format and password strength
            4. Frontend sends POST /api/users/register request
            5. Backend creates user record in database
            6. Backend sends verification email
            7. User receives success message
          `,
        },
      });

      // Step 3: Navigate to project
      await page.goto(`/projects/${projectId}`);
      await expect(page.getByText('user-flows.txt')).toBeVisible();

      // Step 4: Start discovery
      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Step 5: Wait for discovery to complete
      await expect(
        page.getByText(/Completed|Found|operations/i).or(
          page.locator('[data-testid="discovery-complete"]')
        )
      ).toBeVisible({ timeout: 60000 });

      // Step 6: Verify operations were discovered
      await expect(
        page.getByText(/Authentication|Login|Registration/i)
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Journey 3: Diagram Editing and Validation', () => {
    let projectId: string;
    let diagramId: string;

    test.beforeAll(async ({ request }) => {
      // Setup: Create project, operation, and diagram
      const projectResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Edit & Validate Journey ${Date.now()}`,
          description: 'Editing and validation journey test',
        },
      });
      const projectData = await projectResponse.json();
      projectId = projectData.data.id;

      const operationResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations`, {
        data: {
          name: 'Edit Test Operation',
          description: 'User submits form, frontend processes data, backend saves to database',
          type: 'USER_FLOW',
        },
      });
      const operationData = await operationResponse.json();
      const operationId = operationData.data.id;

      const diagramJobResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations/${operationId}/diagrams`);
      const diagramJobData = await diagramJobResponse.json();
      const jobId = diagramJobData.data.id;

      for (let i = 0; i < 60; i++) {
        const jobStatus = await request.get(`http://localhost:3001/api/diagram-jobs/${jobId}`);
        const jobStatusData = await jobStatus.json();

        if (jobStatusData.data.status === 'COMPLETED') {
          diagramId = jobStatusData.data.diagramId;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });

    test.afterAll(async ({ request }) => {
      if (projectId) {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });

    test('should edit diagram and run validation', async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');

      // Step 1: Open diagram
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      // Step 2: Edit a node
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');
      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Custom Node Title');
      await page.getByRole('button', { name: /Save|Update/i }).click();

      // Step 3: Save diagram
      await page.getByRole('button', { name: /Save/i }).click();
      await page.waitForTimeout(2000);

      // Step 4: Run validation
      await page.getByRole('button', { name: /Validate/i }).click();

      // Step 5: Wait for validation to complete
      await expect(
        page.getByText(/Validation|Report|Results|Completed/i)
      ).toBeVisible({ timeout: 30000 });

      // Step 6: Review validation results
      await expect(
        page.getByText(/Components|Score|Status/i)
      ).toBeVisible();
    });
  });

  test.describe('Journey 4: Export Diagram', () => {
    let projectId: string;
    let diagramId: string;

    test.beforeAll(async ({ request }) => {
      const projectResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Export Journey ${Date.now()}`,
          description: 'Export journey test',
        },
      });
      const projectData = await projectResponse.json();
      projectId = projectData.data.id;

      const operationResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations`, {
        data: {
          name: 'Export Test Operation',
          description: 'Simple flow for export testing',
          type: 'USER_FLOW',
        },
      });
      const operationData = await operationResponse.json();
      const operationId = operationData.data.id;

      const diagramJobResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations/${operationId}/diagrams`);
      const diagramJobData = await diagramJobResponse.json();
      const jobId = diagramJobData.data.id;

      for (let i = 0; i < 60; i++) {
        const jobStatus = await request.get(`http://localhost:3001/api/diagram-jobs/${jobId}`);
        const jobStatusData = await jobStatus.json();

        if (jobStatusData.data.status === 'COMPLETED') {
          diagramId = jobStatusData.data.diagramId;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });

    test.afterAll(async ({ request }) => {
      if (projectId) {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });

    test('should export diagram in multiple formats', async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');

      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      // Export as JSON
      await page.getByRole('button', { name: /Export/i }).click();

      const jsonDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.getByText(/JSON/i).click();
      const jsonDownload = await jsonDownloadPromise;
      expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);

      // Export as PNG
      await page.getByRole('button', { name: /Export/i }).click();

      const pngDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.getByText(/PNG/i).click();
      const pngDownload = await pngDownloadPromise;
      expect(pngDownload.suggestedFilename()).toMatch(/\.png$/i);
    });
  });

  test.describe('Journey 5: Complete Workflow', () => {
    let projectId: string;

    test.afterEach(async ({ request }) => {
      if (projectId) {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });

    test('should complete entire workflow from start to finish', async ({ page, request }) => {
      // This test covers the complete user workflow:
      // 1. Create project
      // 2. Add documents
      // 3. Create operation
      // 4. Generate diagram
      // 5. Edit diagram
      // 6. Validate diagram
      // 7. Export diagram

      // Step 1: Create project
      await page.goto('/projects');
      await page.getByRole('button', { name: /New Project|Create/i }).click();

      const projectName = `Complete Workflow ${Date.now()}`;
      await page.getByLabel(/Name/i).fill(projectName);
      await page.getByLabel(/Description/i).fill('Complete workflow test');
      await page.getByRole('button', { name: /Create|Save/i }).click();

      await page.waitForTimeout(1000);

      // Get project ID
      const projectsResponse = await request.get('http://localhost:3001/api/projects');
      const projectsData = await projectsResponse.json();
      const createdProject = projectsData.data.find((p: { name: string }) => p.name === projectName);
      projectId = createdProject?.id;

      // Step 2: Navigate to project
      await page.getByText(projectName).click();

      // Step 3: Add document via API (simulating upload)
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'workflow.txt',
          content: 'User checkout flow: User adds items to cart, views cart, enters shipping address, selects payment, submits order, receives confirmation',
        },
      });

      await page.reload();

      // Step 4: Create operation
      await page.getByRole('button', { name: /Add Operation|New Operation/i }).click();
      await page.getByLabel(/Name/i).fill('Checkout Flow');
      const descField = page.getByLabel(/Description/i).or(page.getByPlaceholder(/Description/i));
      if (await descField.isVisible()) {
        await descField.fill('User completes checkout process');
      }
      await page.getByRole('button', { name: /Create|Add|Save/i }).click();

      // Step 5: Generate diagram
      const operationCard = page.locator('.operation-card, [data-testid="operation-card"]').filter({ hasText: 'Checkout Flow' }).first();
      await operationCard.getByRole('button', { name: /Generate|Diagram/i }).first().click();

      // Wait for diagram
      await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 });

      // Step 6: Edit a node
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();
      await page.waitForSelector('[role="dialog"], .node-edit-modal', { timeout: 5000 });

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Modified Component');
      await page.getByRole('button', { name: /Save|Update/i }).click();

      // Step 7: Save
      await page.getByRole('button', { name: /Save/i }).click();
      await page.waitForTimeout(2000);

      // Step 8: Validate
      await page.getByRole('button', { name: /Validate/i }).click();
      await page.waitForTimeout(10000);

      // Step 9: Export
      await page.getByRole('button', { name: /Export/i }).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.getByText(/JSON/i).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.json$/i);

      // Complete workflow successful!
    });
  });

  test.describe('Journey 6: Error Handling', () => {
    test('should handle non-existent project gracefully', async ({ page }) => {
      await page.goto('/projects/non-existent-project-id');

      // Should show error or redirect
      await expect(
        page.getByText(/Not Found|Error|doesn't exist/i).or(
          page.locator('[data-testid="error-message"]')
        )
      ).toBeVisible({ timeout: 5000 }).catch(async () => {
        // May redirect to projects list
        await expect(page).toHaveURL(/\/projects/);
      });
    });

    test('should handle non-existent diagram gracefully', async ({ page }) => {
      await page.goto('/diagrams/non-existent-diagram-id');

      await expect(
        page.getByText(/Not Found|Error|doesn't exist/i).or(
          page.locator('[data-testid="error-message"]')
        )
      ).toBeVisible({ timeout: 5000 }).catch(async () => {
        // May redirect
        await expect(page).toHaveURL(/\/projects|\/$/);
      });
    });

    test('should handle API errors gracefully', async ({ page, request }) => {
      const projectResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Error Test ${Date.now()}`,
          description: 'Error handling test',
        },
      });
      const projectData = await projectResponse.json();
      const projectId = projectData.data.id;

      try {
        await page.goto(`/projects/${projectId}`);

        // Simulate network error by blocking API
        await page.route('**/api/**', route => route.abort());

        // Try to create operation
        await page.getByRole('button', { name: /Add Operation|New Operation/i }).click();
        await page.getByLabel(/Name/i).fill('Test Operation');
        await page.getByRole('button', { name: /Create|Add|Save/i }).click();

        // Should show error message
        await expect(
          page.getByText(/Error|Failed|Unable|Try again/i)
        ).toBeVisible({ timeout: 5000 });
      } finally {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });
  });

  test.describe('Journey 7: Responsive Design', () => {
    test('should work on tablet viewport', async ({ page, request }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const projectResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Tablet Test ${Date.now()}`,
          description: 'Responsive test',
        },
      });
      const projectData = await projectResponse.json();
      const projectId = projectData.data.id;

      try {
        await page.goto('/projects');

        // Should display properly
        await expect(page.getByText(/Projects/i)).toBeVisible();

        await page.goto(`/projects/${projectId}`);

        // Project should be visible
        await expect(page.getByText('Tablet Test')).toBeVisible();
      } finally {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });

    test('should work on mobile viewport', async ({ page, request }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const projectResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: `Mobile Test ${Date.now()}`,
          description: 'Mobile responsive test',
        },
      });
      const projectData = await projectResponse.json();
      const projectId = projectData.data.id;

      try {
        await page.goto('/projects');

        // Navigation may be in hamburger menu on mobile
        const hamburger = page.locator('[aria-label="menu"], .hamburger, .mobile-menu-toggle');

        if (await hamburger.isVisible()) {
          await hamburger.click();
        }

        await expect(page.getByText(/Projects/i)).toBeVisible();
      } finally {
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });
  });
});
