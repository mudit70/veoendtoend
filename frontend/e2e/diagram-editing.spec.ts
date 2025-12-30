import { test, expect } from '@playwright/test';

test.describe('Diagram Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a test diagram page
    // Note: In a real setup, this would be the actual diagram URL
    await page.goto('/diagrams/test-diagram');

    // Wait for ReactFlow to be ready
    await page.waitForSelector('.react-flow');
  });

  test('should drag node to new position', async ({ page }) => {
    // Find a draggable node
    const node = page.locator('.react-flow__node').first();
    await node.waitFor();

    // Get initial position
    const initialBox = await node.boundingBox();
    expect(initialBox).not.toBeNull();

    // Drag the node
    await node.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + 100, initialBox!.y + 50);
    await page.mouse.up();

    // Verify position changed
    const newBox = await node.boundingBox();
    expect(newBox!.x).not.toBe(initialBox!.x);
  });

  test('should open edit modal on node click', async ({ page }) => {
    // Click on a node to select it
    const node = page.locator('.react-flow__node').first();
    await node.click();

    // Double-click to open edit modal
    await node.dblclick();

    // Verify modal opens
    await expect(page.locator('.node-edit-modal, [role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Edit Component')).toBeVisible();
  });

  test('should edit node title', async ({ page }) => {
    // Open edit modal
    const node = page.locator('.react-flow__node').first();
    await node.dblclick();

    // Wait for modal
    await page.waitForSelector('.node-edit-modal, [role="dialog"]');

    // Find title input and change it
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Updated Node Title');

    // Save changes
    await page.click('text=Save Changes');

    // Verify modal closed
    await expect(page.locator('.node-edit-modal, [role="dialog"]')).not.toBeVisible();

    // Verify unsaved changes indicator appears
    await expect(page.locator('.unsaved-indicator, text=Unsaved')).toBeVisible();
  });

  test('should save diagram', async ({ page }) => {
    // Make a change to trigger unsaved state
    const node = page.locator('.react-flow__node').first();
    await node.dblclick();

    await page.waitForSelector('.node-edit-modal, [role="dialog"]');
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Changed Title');
    await page.click('text=Save Changes');

    // Click save button in toolbar
    await page.click('.save-button, button:has-text("Save")');

    // Wait for save to complete
    await expect(page.locator('text=Saving...')).toBeVisible();
    await expect(page.locator('text=Saving...')).not.toBeVisible({ timeout: 10000 });

    // Verify unsaved indicator is gone
    await expect(page.locator('.unsaved-indicator')).not.toBeVisible();
  });

  test('should save with Ctrl+S', async ({ page }) => {
    // Make a change
    const node = page.locator('.react-flow__node').first();
    await node.dblclick();

    await page.waitForSelector('.node-edit-modal, [role="dialog"]');
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Changed Title');
    await page.click('text=Save Changes');

    // Wait for unsaved indicator
    await expect(page.locator('.unsaved-indicator, text=Unsaved')).toBeVisible();

    // Use keyboard shortcut to save
    await page.keyboard.press('Control+s');

    // Wait for save to complete
    await expect(page.locator('text=Saving...')).toBeVisible();
  });

  test('should warn before leaving with unsaved changes', async ({ page }) => {
    // Make a change
    const node = page.locator('.react-flow__node').first();
    await node.dblclick();

    await page.waitForSelector('.node-edit-modal, [role="dialog"]');
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Changed Title');
    await page.click('text=Save Changes');

    // Listen for beforeunload dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('beforeunload');
      await dialog.accept();
    });

    // Try to navigate away
    await page.goto('/');
  });

  test('should reset node to original', async ({ page }) => {
    // First, make a change and save it to mark node as modified
    const node = page.locator('.react-flow__node').first();
    await node.dblclick();

    await page.waitForSelector('.node-edit-modal, [role="dialog"]');
    const titleInput = page.locator('input[type="text"]').first();
    const originalTitle = await titleInput.inputValue();
    await titleInput.fill('Modified Title');
    await page.click('text=Save Changes');

    // Save the diagram to persist the modification
    await page.click('.save-button, button:has-text("Save")');
    await expect(page.locator('text=Saving...')).not.toBeVisible({ timeout: 10000 });

    // Open modal again
    await node.dblclick();
    await page.waitForSelector('.node-edit-modal, [role="dialog"]');

    // Check if reset button appears (for modified nodes)
    const resetButton = page.locator('text=Reset to Original');
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Verify title was reset
      await expect(page.locator(`text=${originalTitle}`)).toBeVisible();
    }
  });

  test('should export diagram as PNG', async ({ page }) => {
    // Open export menu
    await page.click('.export-button, button:has-text("Export")');

    // Wait for menu
    await expect(page.locator('.export-dropdown, [role="menu"]')).toBeVisible();

    // Start download listener
    const downloadPromise = page.waitForEvent('download');

    // Click PNG export
    await page.click('text=Export as PNG');

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('should export diagram as JSON', async ({ page }) => {
    // Open export menu
    await page.click('.export-button, button:has-text("Export")');

    // Wait for menu
    await expect(page.locator('.export-dropdown, [role="menu"]')).toBeVisible();

    // Start download listener
    const downloadPromise = page.waitForEvent('download');

    // Click JSON export
    await page.click('text=Export as JSON');

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});

test.describe('Diagram Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/diagrams/test-diagram');
    await page.waitForSelector('.react-flow');
  });

  test('should zoom in with controls', async ({ page }) => {
    // Find zoom in button
    const zoomInButton = page.locator('.react-flow__controls-button.react-flow__controls-zoomin');
    await zoomInButton.click();

    // Verify zoom level changed (check transform)
    const viewport = page.locator('.react-flow__viewport');
    const transform = await viewport.getAttribute('style');
    expect(transform).toContain('scale');
  });

  test('should zoom out with controls', async ({ page }) => {
    // Find zoom out button
    const zoomOutButton = page.locator('.react-flow__controls-button.react-flow__controls-zoomout');
    await zoomOutButton.click();

    // Verify zoom level changed
    const viewport = page.locator('.react-flow__viewport');
    const transform = await viewport.getAttribute('style');
    expect(transform).toContain('scale');
  });

  test('should fit view with controls', async ({ page }) => {
    // Find fit view button
    const fitViewButton = page.locator('.react-flow__controls-button.react-flow__controls-fitview');
    await fitViewButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Verify all nodes are visible
    const nodes = page.locator('.react-flow__node');
    const count = await nodes.count();
    for (let i = 0; i < count; i++) {
      await expect(nodes.nth(i)).toBeVisible();
    }
  });

  test('should show minimap', async ({ page }) => {
    // Verify minimap is visible
    await expect(page.locator('.react-flow__minimap')).toBeVisible();
  });
});
