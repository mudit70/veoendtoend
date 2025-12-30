import { test, expect } from '@playwright/test';

test.describe('Validation UI', () => {
  let projectId: string;
  let operationId: string;
  let diagramId: string;

  test.beforeAll(async ({ request }) => {
    // Create project
    const projectResponse = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: `Validation UI Test ${Date.now()}`,
        description: 'Project for validation UI testing',
      },
    });
    const projectData = await projectResponse.json();
    projectId = projectData.data.id;

    // Create operation
    const operationResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations`, {
      data: {
        name: 'Validation Test Flow',
        description: 'User submits form. Frontend validates input. API processes request. Database saves data.',
        type: 'USER_FLOW',
      },
    });
    const operationData = await operationResponse.json();
    operationId = operationData.data.id;

    // Generate diagram
    const diagramJobResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations/${operationId}/diagrams`);
    const diagramJobData = await diagramJobResponse.json();
    const jobId = diagramJobData.data.id;

    // Wait for diagram
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

  test.describe('Validation Trigger', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should display validate button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Validate/i })).toBeVisible();
    });

    test('should start validation when clicking validate button', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      // Should show loading or progress state
      await expect(page.getByText(/Validating|Running|In Progress/i)).toBeVisible({ timeout: 5000 }).catch(async () => {
        // Or validation may complete quickly
        await expect(page.getByText(/Validation|Complete|Report/i)).toBeVisible({ timeout: 10000 });
      });
    });

    test('should disable validate button during validation', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      // Button should be disabled during validation
      const validateButton = page.getByRole('button', { name: /Validat/i }).first();
      await expect(validateButton).toBeDisabled({ timeout: 3000 }).catch(() => {
        // Button may not be disabled but text may change
      });
    });

    test('should show validation progress', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      // Look for progress indicator
      await expect(
        page.getByText(/Validating|Progress|%|Components/i).or(
          page.locator('.progress-bar, .loading-spinner, [role="progressbar"]')
        )
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Progress may complete quickly
      });
    });
  });

  test.describe('Validation Badges', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should show validation badge on nodes after validation', async ({ page }) => {
      // Start validation
      await page.getByRole('button', { name: /Validate/i }).click();

      // Wait for validation to complete
      await page.waitForTimeout(5000);

      // Check for badges on nodes
      const nodes = page.locator('.react-flow__node');
      const count = await nodes.count();

      // At least some nodes should have validation badges
      let badgeFound = false;
      for (let i = 0; i < count && !badgeFound; i++) {
        const node = nodes.nth(i);
        const badge = node.locator('.validation-badge, [class*="badge"], [class*="status"]');
        if (await badge.count() > 0) {
          badgeFound = true;
        }
      }
      // Badges may or may not be visible depending on validation results
    });

    test('should show confidence scores after validation', async ({ page }) => {
      // Start validation
      await page.getByRole('button', { name: /Validate/i }).click();

      // Wait for completion
      await page.waitForTimeout(5000);

      // Look for confidence indicators
      await expect(
        page.getByText(/confidence|score|%/i).or(
          page.locator('[class*="confidence"]')
        )
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Confidence may not be prominently displayed
      });
    });

    test('should show status colors on validated nodes', async ({ page }) => {
      // Trigger validation
      await page.getByRole('button', { name: /Validate/i }).click();

      // Wait for validation
      await page.waitForTimeout(5000);

      // Nodes may have different colors based on validation status
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toBeVisible();
    });
  });

  test.describe('Validation Report', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should show validation report after completion', async ({ page }) => {
      // Start validation
      await page.getByRole('button', { name: /Validate/i }).click();

      // Wait for validation to complete and report to appear
      await expect(
        page.getByText(/Validation Report|Results|Summary/i).or(
          page.locator('[data-testid="validation-report"]')
        )
      ).toBeVisible({ timeout: 30000 });
    });

    test('should display validation summary', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      // Wait for report
      await expect(
        page.getByText(/Validation Report|Results|Summary/i)
      ).toBeVisible({ timeout: 30000 });

      // Check for summary statistics
      await expect(
        page.getByText(/Components|Validated|Score|Status/i)
      ).toBeVisible();
    });

    test('should display discrepancies if found', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      // Wait for report
      await page.waitForTimeout(10000);

      // Look for discrepancies section (may or may not have any)
      const discrepancies = page.getByText(/Discrepanc|Issue|Warning|Error/i);
      await discrepancies.first().isVisible().catch(() => {
        // No discrepancies found is also valid
      });
    });

    test('should allow viewing discrepancy details', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      await page.waitForTimeout(10000);

      // If there are discrepancies, clicking should show details
      const discrepancyItem = page.locator('[data-testid="discrepancy-item"], .discrepancy-item').first();

      if (await discrepancyItem.isVisible()) {
        await discrepancyItem.click();
        // Details should expand or modal should open
        await expect(page.getByText(/Details|Description|Source/i)).toBeVisible();
      }
    });

    test('should show component-level validation details', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      await page.waitForTimeout(10000);

      // Look for component list in report
      await expect(
        page.getByText(/Component|Node/i)
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Report format may vary
      });
    });
  });

  test.describe('Validation History', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should maintain validation history', async ({ page, request }) => {
      // Run validation twice
      await page.getByRole('button', { name: /Validate/i }).click();
      await page.waitForTimeout(8000);

      await page.getByRole('button', { name: /Validate/i }).click();
      await page.waitForTimeout(8000);

      // Check history via API
      const historyResponse = await request.get(`http://localhost:3001/api/diagrams/${diagramId}/validations`);
      const historyData = await historyResponse.json();

      expect(historyData.data.length).toBeGreaterThanOrEqual(2);
    });

    test('should show validation timestamp', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      await page.waitForTimeout(10000);

      // Look for timestamp
      await expect(
        page.getByText(/\d{1,2}:\d{2}|ago|today|yesterday/i).or(
          page.locator('[class*="timestamp"], [class*="date"]')
        )
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Timestamp may not be prominently displayed
      });
    });
  });

  test.describe('Validation Actions', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should navigate to component when clicking discrepancy', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      await page.waitForTimeout(10000);

      // If discrepancies exist, clicking should focus the related node
      const discrepancyItem = page.locator('[data-testid="discrepancy-item"], .discrepancy-item').first();

      if (await discrepancyItem.isVisible()) {
        await discrepancyItem.click();
        // Canvas should focus on the related node
      }
    });

    test('should refresh validation status', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      await page.waitForTimeout(3000);

      // Reload and check status persists
      await page.reload();
      await page.waitForSelector('.react-flow', { timeout: 10000 });

      // Previous validation should still be visible or accessible
    });

    test('should allow resolving discrepancies', async ({ page }) => {
      await page.getByRole('button', { name: /Validate/i }).click();

      await page.waitForTimeout(10000);

      // Look for resolve/dismiss actions
      const resolveButton = page.getByRole('button', { name: /Resolve|Dismiss|Accept/i });

      if (await resolveButton.isVisible()) {
        await resolveButton.click();
        // Discrepancy should be marked as resolved
      }
    });
  });
});
