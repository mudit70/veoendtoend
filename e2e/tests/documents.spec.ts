import { test, expect } from '@playwright/test';

test.describe('Document Management UI', () => {
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    // Create a test project
    const response = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: 'E2E Test Project',
        description: 'Project for E2E testing documents',
      },
    });
    const data = await response.json();
    projectId = data.data.id;
  });

  test.afterEach(async ({ request }) => {
    // Clean up the test project
    if (projectId) {
      await request.delete(`http://localhost:3001/api/projects/${projectId}`);
    }
  });

  test('should display empty document list for new project', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await expect(page.getByText('No documents yet')).toBeVisible();
    await expect(page.getByText('Upload files, import from folders')).toBeVisible();
  });

  test('should display document upload area', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await expect(page.getByText('Click to upload')).toBeVisible();
    await expect(page.getByText('drag and drop')).toBeVisible();
  });

  test('should display import buttons', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await expect(page.getByRole('button', { name: /Import from Folders/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import from Git Repos/i })).toBeVisible();
  });

  test('should open folder import modal', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await page.getByRole('button', { name: /Import from Folders/i }).click();

    await expect(page.getByRole('heading', { name: 'Import from Local Folders' })).toBeVisible();
    await expect(page.getByPlaceholder('Folder path')).toBeVisible();
    await expect(page.getByText('Include subfolders')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Files' })).toBeVisible();
  });

  test('should close folder import modal on cancel', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await page.getByRole('button', { name: /Import from Folders/i }).click();
    await expect(page.getByRole('heading', { name: 'Import from Local Folders' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Import from Local Folders' })).not.toBeVisible();
  });

  test('should open repo import modal', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await page.getByRole('button', { name: /Import from Git Repos/i }).click();

    await expect(page.getByRole('heading', { name: 'Import from Git Repositories' })).toBeVisible();
    await expect(page.getByPlaceholder(/Repository URL/)).toBeVisible();
    await expect(page.getByPlaceholder(/Display name/)).toBeVisible();
    await expect(page.getByPlaceholder(/Branch/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Repositories' })).toBeVisible();
  });

  test('should close repo import modal on cancel', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await page.getByRole('button', { name: /Import from Git Repos/i }).click();
    await expect(page.getByRole('heading', { name: 'Import from Git Repositories' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Import from Git Repositories' })).not.toBeVisible();
  });

  test('should add multiple folder entries in modal', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await page.getByRole('button', { name: /Import from Folders/i }).click();

    // Should have one folder entry by default
    await expect(page.getByPlaceholder('Folder path')).toHaveCount(1);

    // Add another folder
    await page.getByText('+ Add another folder').click();
    await expect(page.getByPlaceholder('Folder path')).toHaveCount(2);

    // Add another
    await page.getByText('+ Add another folder').click();
    await expect(page.getByPlaceholder('Folder path')).toHaveCount(3);
  });

  test('should add multiple repo entries in modal', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    await page.getByRole('button', { name: /Import from Git Repos/i }).click();

    // Should have one repo entry by default
    await expect(page.getByPlaceholder(/Repository URL/)).toHaveCount(1);

    // Add another repo
    await page.getByText('+ Add another repository').click();
    await expect(page.getByPlaceholder(/Repository URL/)).toHaveCount(2);
  });
});

test.describe('Document API', () => {
  let projectId: string;

  test.beforeEach(async ({ request }) => {
    // Create a test project
    const response = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: 'API Test Project',
        description: 'Project for API testing',
      },
    });
    const data = await response.json();
    projectId = data.data.id;
  });

  test.afterEach(async ({ request }) => {
    // Clean up
    if (projectId) {
      await request.delete(`http://localhost:3001/api/projects/${projectId}`);
    }
  });

  test('should list empty documents for new project', async ({ request }) => {
    const response = await request.get(`http://localhost:3001/api/documents/project/${projectId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
  });

  test('should return 404 for non-existent document', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/documents/non-existent-id');
    expect(response.status()).toBe(404);
  });
});
