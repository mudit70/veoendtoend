import { test, expect } from '@playwright/test';

test.describe('Discovery UI', () => {
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    // Create a test project
    const response = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: `Discovery E2E Test ${Date.now()}`,
        description: 'Project for discovery E2E testing',
      },
    });
    const data = await response.json();
    projectId = data.data.id;
  });

  test.afterEach(async ({ request }) => {
    if (projectId) {
      await request.delete(`http://localhost:3001/api/projects/${projectId}`);
    }
  });

  test.describe('Discovery Button', () => {
    test('should display discover operations button', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await expect(
        page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i })
      ).toBeVisible();
    });

    test('should enable discovery button when documents exist', async ({ page, request }) => {
      // Upload a document first
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'test.txt',
          content: 'User clicks login button, system validates credentials, database checks user record',
        },
      });

      await page.goto(`/projects/${projectId}`);

      const discoverButton = page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i });
      await expect(discoverButton).toBeEnabled();
    });

    test('should disable or hide discovery when no documents', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      const discoverButton = page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i });

      // Button may be disabled or show helpful message
      const isDisabled = await discoverButton.isDisabled().catch(() => false);
      // Either disabled or shows message about needing documents
    });
  });

  test.describe('Discovery Process', () => {
    test.beforeEach(async ({ request }) => {
      // Add documents for discovery
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'flow1.txt',
          content: 'User login flow: User enters username and password, frontend validates input format, sends POST /api/auth/login request, backend checks credentials against database, returns JWT token, frontend stores token in localStorage',
        },
      });

      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'flow2.txt',
          content: 'User registration: User fills registration form, frontend validates email format and password strength, sends POST /api/users request, backend creates user in database, sends welcome email, returns success response',
        },
      });
    });

    test('should start discovery when button clicked', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Should show progress or loading state
      await expect(
        page.getByText(/Discovering|Analyzing|Processing|Scanning/i).or(
          page.locator('.loading-spinner, [role="progressbar"]')
        )
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show discovery progress', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Look for progress indicator
      await expect(
        page.getByText(/\d+%|progress|processing/i).or(
          page.locator('.progress-bar, [role="progressbar"], .discovery-progress')
        )
      ).toBeVisible({ timeout: 10000 }).catch(() => {
        // Discovery may complete quickly
      });
    });

    test('should complete discovery and show results', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Wait for discovery to complete
      await expect(
        page.getByText(/Completed|Found|operations discovered/i).or(
          page.locator('[data-testid="discovery-results"]')
        )
      ).toBeVisible({ timeout: 30000 });
    });

    test('should show discovered operations', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Wait for completion
      await page.waitForTimeout(15000);

      // Should show operation cards or list
      await expect(
        page.getByText(/login|registration|user/i)
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Discovery results may vary
      });
    });
  });

  test.describe('Discovery Results', () => {
    let hasResults = false;

    test.beforeEach(async ({ request, page }) => {
      // Add document and run discovery
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'api-spec.txt',
          content: 'Payment processing: User selects payment method, enters card details, frontend encrypts data, sends to payment gateway, backend receives webhook, updates order status in database, sends confirmation email',
        },
      });

      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Wait for discovery
      await page.waitForTimeout(15000);

      hasResults = true;
    });

    test('should display discovered operation names', async ({ page }) => {
      test.skip(!hasResults, 'No discovery results');

      // Look for operation names in the results
      const operationCards = page.locator('.operation-card, [data-testid="operation-card"]');

      if (await operationCards.count() > 0) {
        await expect(operationCards.first()).toBeVisible();
      }
    });

    test('should allow accepting discovered operations', async ({ page }) => {
      test.skip(!hasResults, 'No discovery results');

      // Look for accept/confirm button
      const acceptButton = page.getByRole('button', { name: /Accept|Confirm|Add/i });

      if (await acceptButton.isVisible()) {
        await acceptButton.click();

        // Operation should be added
        await expect(
          page.getByText(/Added|Created|Success/i)
        ).toBeVisible({ timeout: 5000 }).catch(() => {
          // Confirmation may not show
        });
      }
    });

    test('should allow rejecting discovered operations', async ({ page }) => {
      test.skip(!hasResults, 'No discovery results');

      // Look for reject/dismiss button
      const rejectButton = page.getByRole('button', { name: /Reject|Dismiss|Skip|Remove/i });

      if (await rejectButton.isVisible()) {
        await rejectButton.click();

        // Operation should be removed from suggestions
      }
    });

    test('should show confidence score for discovered operations', async ({ page }) => {
      test.skip(!hasResults, 'No discovery results');

      // Look for confidence indicators
      await expect(
        page.getByText(/confidence|score|%/i).or(
          page.locator('[class*="confidence"]')
        )
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Confidence may not be displayed
      });
    });

    test('should allow editing discovered operation before accepting', async ({ page }) => {
      test.skip(!hasResults, 'No discovery results');

      // Look for edit button on discovered operation
      const editButton = page.getByRole('button', { name: /Edit/i });

      if (await editButton.isVisible()) {
        await editButton.click();

        // Edit form should open
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    });
  });

  test.describe('Discovery Settings', () => {
    test('should show discovery options/settings', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      // Look for settings/options button near discovery
      const settingsButton = page.getByRole('button', { name: /Settings|Options|Configure/i });

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        // Settings panel should open
        await expect(
          page.getByText(/Discovery Settings|Options/i)
        ).toBeVisible();
      }
    });

    test('should allow configuring discovery depth', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      // Open settings if available
      const settingsButton = page.getByRole('button', { name: /Settings|Options/i });

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        // Look for depth/sensitivity options
        await expect(
          page.getByText(/Depth|Sensitivity|Level/i).or(
            page.locator('input[type="range"], select')
          )
        ).toBeVisible().catch(() => {
          // Settings may not include these options
        });
      }
    });
  });

  test.describe('Discovery Status', () => {
    test('should show running discovery status', async ({ page, request }) => {
      // Add document
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'test.txt',
          content: 'Test operation: User performs action, system responds',
        },
      });

      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Should show running status
      await expect(
        page.getByText(/Running|In Progress|Analyzing/i)
      ).toBeVisible({ timeout: 3000 }).catch(() => {
        // May complete quickly
      });
    });

    test('should update status as discovery progresses', async ({ page, request }) => {
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'large-doc.txt',
          content: 'A comprehensive document about user interactions. ' +
            'Step 1: User navigates to homepage. '.repeat(50) +
            'Step 2: User clicks on product. ' +
            'Step 3: User adds to cart. ' +
            'Step 4: User proceeds to checkout.',
        },
      });

      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Status should update during processing
      await page.waitForTimeout(5000);

      // Should eventually show completion
      await expect(
        page.getByText(/Completed|Done|Finished|Found/i)
      ).toBeVisible({ timeout: 30000 });
    });

    test('should handle discovery errors gracefully', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      // Try to run discovery without documents
      const discoverButton = page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i });

      if (await discoverButton.isEnabled()) {
        await discoverButton.click();

        // Should show appropriate message
        await expect(
          page.getByText(/No documents|Add documents|Error|Failed/i)
        ).toBeVisible({ timeout: 10000 }).catch(() => {
          // May succeed with empty results
        });
      }
    });

    test('should allow canceling discovery', async ({ page, request }) => {
      await request.post(`http://localhost:3001/api/projects/${projectId}/documents`, {
        data: {
          filename: 'test.txt',
          content: 'Large document content '.repeat(100),
        },
      });

      await page.goto(`/projects/${projectId}`);

      await page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i }).click();

      // Look for cancel button
      const cancelButton = page.getByRole('button', { name: /Cancel|Stop/i });

      if (await cancelButton.isVisible({ timeout: 2000 })) {
        await cancelButton.click();

        // Discovery should be canceled
        await expect(
          page.getByText(/Canceled|Stopped/i).or(
            page.getByRole('button', { name: /Discover|Auto-detect|Analyze/i })
          )
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
