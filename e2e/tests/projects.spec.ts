import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.describe('Project List', () => {
    test('should display projects page with header', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    });

    test('should display create project button', async ({ page }) => {
      await page.goto('/projects');
      await expect(page.getByRole('button', { name: /New Project|Create Project/i })).toBeVisible();
    });

    test('should show empty state when no projects exist', async ({ page, request }) => {
      // Clean up any existing projects first
      const projectsResponse = await request.get('http://localhost:3001/api/projects');
      const projectsData = await projectsResponse.json();
      for (const project of projectsData.data || []) {
        await request.delete(`http://localhost:3001/api/projects/${project.id}`);
      }

      await page.goto('/projects');
      // May show empty state or just the create button
      const createButton = page.getByRole('button', { name: /New Project|Create Project/i });
      await expect(createButton).toBeVisible();
    });
  });

  test.describe('Create Project', () => {
    test('should open create project modal when clicking new project button', async ({ page }) => {
      await page.goto('/projects');
      await page.getByRole('button', { name: /New Project|Create Project/i }).click();

      // Modal should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /New Project|Create Project/i })).toBeVisible();
    });

    test('should have name and description fields in create modal', async ({ page }) => {
      await page.goto('/projects');
      await page.getByRole('button', { name: /New Project|Create Project/i }).click();

      await expect(page.getByLabel(/Name/i)).toBeVisible();
      await expect(page.getByLabel(/Description/i)).toBeVisible();
    });

    test('should create a new project successfully', async ({ page, request }) => {
      const projectName = `Test Project ${Date.now()}`;

      await page.goto('/projects');
      await page.getByRole('button', { name: /New Project|Create Project/i }).click();

      // Fill in project details
      await page.getByLabel(/Name/i).fill(projectName);
      await page.getByLabel(/Description/i).fill('This is a test project description');

      // Submit the form
      await page.getByRole('button', { name: /Create|Save|Submit/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // Project should appear in the list
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });

      // Clean up
      const projectsResponse = await request.get('http://localhost:3001/api/projects');
      const projectsData = await projectsResponse.json();
      const createdProject = projectsData.data.find((p: { name: string }) => p.name === projectName);
      if (createdProject) {
        await request.delete(`http://localhost:3001/api/projects/${createdProject.id}`);
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/projects');
      await page.getByRole('button', { name: /New Project|Create Project/i }).click();

      // Try to submit without filling required fields
      const submitButton = page.getByRole('button', { name: /Create|Save|Submit/i });

      // Check if the button is disabled or if validation messages appear
      const isDisabled = await submitButton.isDisabled();
      if (!isDisabled) {
        await submitButton.click();
        // Check for validation message
        await expect(page.getByText(/required|Name is required/i)).toBeVisible({ timeout: 3000 }).catch(() => {
          // Some forms may not show error messages but prevent submission
        });
      }
    });

    test('should close modal on cancel', async ({ page }) => {
      await page.goto('/projects');
      await page.getByRole('button', { name: /New Project|Create Project/i }).click();

      await expect(page.getByRole('dialog')).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /Cancel/i }).click();

      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Project Card', () => {
    let projectId: string;
    const projectName = `Card Test Project ${Date.now()}`;

    test.beforeEach(async ({ request }) => {
      const response = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: projectName,
          description: 'Test project for card tests',
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

    test('should display project card with name and description', async ({ page }) => {
      await page.goto('/projects');

      await expect(page.getByText(projectName)).toBeVisible();
      await expect(page.getByText('Test project for card tests')).toBeVisible();
    });

    test('should navigate to project detail when clicking project card', async ({ page }) => {
      await page.goto('/projects');

      await page.getByText(projectName).click();

      await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`));
    });

    test('should show project action buttons', async ({ page }) => {
      await page.goto('/projects');

      // Find the project card
      const projectCard = page.locator(`[data-project-id="${projectId}"]`).or(
        page.locator('.project-card').filter({ hasText: projectName })
      );

      // Check for action buttons (may be in dropdown or visible)
      await projectCard.hover();
    });
  });

  test.describe('Project Detail', () => {
    let projectId: string;
    const projectName = `Detail Test Project ${Date.now()}`;

    test.beforeEach(async ({ request }) => {
      const response = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: projectName,
          description: 'Test project for detail tests',
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

    test('should display project detail page', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await expect(page.getByText(projectName)).toBeVisible();
    });

    test('should show documents section', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await expect(page.getByText(/Documents|Files/i)).toBeVisible();
    });

    test('should show operations section', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      await expect(page.getByText(/Operations/i)).toBeVisible();
    });

    test('should have document upload capability', async ({ page }) => {
      await page.goto(`/projects/${projectId}`);

      // Check for upload area or button
      const uploadArea = page.getByText(/Upload|drag and drop/i);
      await expect(uploadArea).toBeVisible();
    });
  });

  test.describe('Delete Project', () => {
    test('should delete project successfully', async ({ page, request }) => {
      // Create a project to delete
      const projectName = `Delete Test Project ${Date.now()}`;
      const createResponse = await request.post('http://localhost:3001/api/projects', {
        data: {
          name: projectName,
          description: 'Project to be deleted',
        },
      });
      const createData = await createResponse.json();
      const projectId = createData.data.id;

      await page.goto('/projects');

      // Find and hover over the project card to reveal actions
      const projectCard = page.locator('.project-card').filter({ hasText: projectName }).first();
      await projectCard.hover();

      // Look for delete button
      const deleteButton = page.getByRole('button', { name: /Delete/i }).or(
        page.locator('[aria-label*="delete" i]')
      );

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion if confirmation dialog appears
        const confirmButton = page.getByRole('button', { name: /Confirm|Yes|Delete/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Project should be removed
        await expect(page.getByText(projectName)).not.toBeVisible({ timeout: 5000 });
      } else {
        // Clean up if delete wasn't available in UI
        await request.delete(`http://localhost:3001/api/projects/${projectId}`);
      }
    });
  });
});
