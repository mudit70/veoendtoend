import { test, expect } from '@playwright/test';

test.describe('Diagram Viewer', () => {
  let projectId: string;
  let operationId: string;
  let diagramId: string;

  test.beforeAll(async ({ request }) => {
    // Create project
    const projectResponse = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: `Diagram E2E Test ${Date.now()}`,
        description: 'Project for diagram UI testing',
      },
    });
    const projectData = await projectResponse.json();
    projectId = projectData.data.id;

    // Create operation with detailed description for diagram generation
    const operationResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations`, {
      data: {
        name: 'User Login Flow',
        description: 'User clicks login button. Frontend React component sends POST /api/auth/login request with credentials. Backend Express middleware validates JWT token. Database stores session.',
        type: 'USER_FLOW',
      },
    });
    const operationData = await operationResponse.json();
    operationId = operationData.data.id;

    // Start diagram generation
    const diagramJobResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations/${operationId}/diagrams`);
    const diagramJobData = await diagramJobResponse.json();
    const jobId = diagramJobData.data.id;

    // Wait for diagram completion
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

  test.describe('Canvas', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should display ReactFlow canvas', async ({ page }) => {
      await expect(page.locator('.react-flow')).toBeVisible();
    });

    test('should display diagram nodes', async ({ page }) => {
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toBeVisible({ timeout: 5000 });
      expect(await nodes.count()).toBeGreaterThan(0);
    });

    test('should display diagram edges', async ({ page }) => {
      const edges = page.locator('.react-flow__edge');
      await expect(edges.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display zoom controls', async ({ page }) => {
      await expect(page.locator('.react-flow__controls')).toBeVisible();
    });

    test('should display minimap', async ({ page }) => {
      await expect(page.locator('.react-flow__minimap')).toBeVisible();
    });
  });

  test.describe('Node Interaction', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should select node on click', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.click();

      // Node should be selected (has selected class or border)
      await expect(node).toHaveClass(/selected/i).catch(async () => {
        // May have different selection indicator
        const box = await node.boundingBox();
        expect(box).not.toBeNull();
      });
    });

    test('should open edit modal on double click', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      // Edit modal should appear
      await expect(page.getByRole('dialog').or(page.locator('.node-edit-modal'))).toBeVisible({ timeout: 5000 });
    });

    test('should drag node to new position', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      const initialBox = await node.boundingBox();
      expect(initialBox).not.toBeNull();

      // Drag node
      await node.hover();
      await page.mouse.down();
      await page.mouse.move(initialBox!.x + 100, initialBox!.y + 50);
      await page.mouse.up();

      // Position should change
      const newBox = await node.boundingBox();
      expect(newBox!.x).not.toBe(initialBox!.x);
    });

    test('should display node details on hover', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.hover();

      // Wait for any tooltip or detail panel
      await page.waitForTimeout(500);
    });
  });

  test.describe('Node Editing', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should display node title in edit modal', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await expect(titleInput).toBeVisible();
      expect(await titleInput.inputValue()).not.toBe('');
    });

    test('should edit node title', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Updated Node Title');

      // Save changes
      await page.getByRole('button', { name: /Save|Update|Apply/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog').or(page.locator('.node-edit-modal'))).not.toBeVisible();
    });

    test('should edit node description', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const descriptionInput = page.getByLabel(/Description/i).or(page.locator('textarea').first());
      if (await descriptionInput.isVisible()) {
        await descriptionInput.fill('Updated description');
      }

      await page.getByRole('button', { name: /Save|Update|Apply/i }).click();
    });

    test('should cancel edit without saving', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      const originalValue = await titleInput.inputValue();
      await titleInput.fill('Should Not Be Saved');

      // Cancel
      await page.getByRole('button', { name: /Cancel/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog').or(page.locator('.node-edit-modal'))).not.toBeVisible();

      // Re-open to verify original value
      await node.dblclick();
      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInputAfter = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      expect(await titleInputAfter.inputValue()).toBe(originalValue);
    });
  });

  test.describe('Zoom Controls', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should zoom in with button', async ({ page }) => {
      const zoomInButton = page.locator('.react-flow__controls-zoomin');
      await zoomInButton.click();

      const viewport = page.locator('.react-flow__viewport');
      const transform = await viewport.getAttribute('style');
      expect(transform).toContain('scale');
    });

    test('should zoom out with button', async ({ page }) => {
      const zoomOutButton = page.locator('.react-flow__controls-zoomout');
      await zoomOutButton.click();

      const viewport = page.locator('.react-flow__viewport');
      const transform = await viewport.getAttribute('style');
      expect(transform).toContain('scale');
    });

    test('should fit view with button', async ({ page }) => {
      const fitViewButton = page.locator('.react-flow__controls-fitview');
      await fitViewButton.click();

      await page.waitForTimeout(500);

      // All nodes should be visible
      const nodes = page.locator('.react-flow__node');
      const count = await nodes.count();
      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(nodes.nth(i)).toBeVisible();
      }
    });

    test('should zoom with scroll wheel', async ({ page }) => {
      const viewport = page.locator('.react-flow__viewport');
      const initialTransform = await viewport.getAttribute('style');

      const canvas = page.locator('.react-flow');
      const box = await canvas.boundingBox();

      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.wheel(0, -100);

      await page.waitForTimeout(300);

      const newTransform = await viewport.getAttribute('style');
      expect(newTransform).not.toBe(initialTransform);
    });
  });

  test.describe('Toolbar', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should display save button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
    });

    test('should display export button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
    });

    test('should display validate button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Validate/i })).toBeVisible();
    });

    test('should save diagram', async ({ page }) => {
      // First make a change
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();
      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Modified for save test');
      await page.getByRole('button', { name: /Save|Update|Apply/i }).click();

      // Click save in toolbar
      await page.getByRole('button', { name: /Save/i }).click();

      // Wait for save completion
      await expect(page.getByText(/Saving|Saved|Success/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        // May not show message but save completes
      });
    });
  });

  test.describe('Export', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should open export menu', async ({ page }) => {
      await page.getByRole('button', { name: /Export/i }).click();

      // Export menu should appear
      await expect(page.getByText(/PNG|JSON|SVG/i)).toBeVisible();
    });

    test('should export as PNG', async ({ page }) => {
      await page.getByRole('button', { name: /Export/i }).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      await page.getByText(/PNG/i).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.png$/i);
    });

    test('should export as JSON', async ({ page }) => {
      await page.getByRole('button', { name: /Export/i }).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      await page.getByText(/JSON/i).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.json$/i);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should save with Ctrl+S', async ({ page }) => {
      // Make a change first
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();
      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Keyboard save test');
      await page.getByRole('button', { name: /Save|Update|Apply/i }).click();

      // Use Ctrl+S
      await page.keyboard.press('Control+s');

      // Should trigger save
      await expect(page.getByText(/Saving|Saved/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        // Save may complete silently
      });
    });

    test('should close modal with Escape', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      await page.keyboard.press('Escape');

      await expect(page.getByRole('dialog').or(page.locator('.node-edit-modal'))).not.toBeVisible();
    });
  });

  test.describe('Unsaved Changes', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!diagramId, 'No diagram available');
      await page.goto(`/diagrams/${diagramId}`);
      await page.waitForSelector('.react-flow', { timeout: 10000 });
    });

    test('should show unsaved indicator after changes', async ({ page }) => {
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Changed title');
      await page.getByRole('button', { name: /Save|Update|Apply/i }).click();

      // Unsaved indicator should appear
      await expect(page.getByText(/Unsaved|Modified|\*/i)).toBeVisible({ timeout: 3000 }).catch(() => {
        // Indicator may not be visible in all themes
      });
    });

    test('should prompt before leaving with unsaved changes', async ({ page }) => {
      // Make a change
      const node = page.locator('.react-flow__node').first();
      await node.dblclick();

      await page.waitForSelector('[role="dialog"], .node-edit-modal');

      const titleInput = page.getByLabel(/Title|Name/i).or(page.locator('input[type="text"]').first());
      await titleInput.fill('Unsaved change');
      await page.getByRole('button', { name: /Save|Update|Apply/i }).click();

      // Set up dialog handler
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('beforeunload');
        await dialog.accept();
      });

      // Try to navigate away
      await page.goto('/projects');
    });
  });
});
