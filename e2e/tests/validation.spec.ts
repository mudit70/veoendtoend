import { test, expect } from '@playwright/test';

test.describe('Validation API', () => {
  let projectId: string;
  let diagramId: string;

  test.beforeEach(async ({ request }) => {
    // Create a test project
    const projectResponse = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: 'Validation Test Project',
        description: 'Project for validation E2E testing',
      },
    });
    const projectData = await projectResponse.json();
    projectId = projectData.data.id;

    // Create a test operation
    const operationResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations`, {
      data: {
        name: 'Test Operation',
        description: 'Operation for validation testing',
        type: 'USER_FLOW',
      },
    });
    const operationData = await operationResponse.json();
    const operationId = operationData.data.id;

    // Start diagram generation
    const diagramJobResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations/${operationId}/diagrams`);
    const diagramJobData = await diagramJobResponse.json();
    const jobId = diagramJobData.data.id;

    // Poll for diagram completion
    let diagram;
    for (let i = 0; i < 30; i++) {
      const jobStatus = await request.get(`http://localhost:3001/api/diagram-jobs/${jobId}`);
      const jobStatusData = await jobStatus.json();

      if (jobStatusData.data.status === 'COMPLETED') {
        diagram = jobStatusData.data;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (diagram && diagram.diagramId) {
      diagramId = diagram.diagramId;
    }
  });

  test.afterEach(async ({ request }) => {
    // Clean up the test project
    if (projectId) {
      await request.delete(`http://localhost:3001/api/projects/${projectId}`);
    }
  });

  test('should trigger validation for a diagram', async ({ request }) => {
    test.skip(!diagramId, 'No diagram available');

    const response = await request.post(`http://localhost:3001/api/diagrams/${diagramId}/validate`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.validationId).toBeDefined();
  });

  test('should get validation status', async ({ request }) => {
    test.skip(!diagramId, 'No diagram available');

    // Start validation
    const startResponse = await request.post(`http://localhost:3001/api/diagrams/${diagramId}/validate`);
    const startData = await startResponse.json();
    const validationId = startData.data.validationId;

    // Get status
    const statusResponse = await request.get(`http://localhost:3001/api/validations/${validationId}/status`);
    expect(statusResponse.ok()).toBeTruthy();

    const statusData = await statusResponse.json();
    expect(statusData.success).toBe(true);
    expect(statusData.data.status).toBeDefined();
    expect(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).toContain(statusData.data.status);
  });

  test('should get validation report after completion', async ({ request }) => {
    test.skip(!diagramId, 'No diagram available');

    // Start validation
    const startResponse = await request.post(`http://localhost:3001/api/diagrams/${diagramId}/validate`);
    const startData = await startResponse.json();
    const validationId = startData.data.validationId;

    // Poll for completion
    let completed = false;
    for (let i = 0; i < 30; i++) {
      const statusResponse = await request.get(`http://localhost:3001/api/validations/${validationId}/status`);
      const statusData = await statusResponse.json();

      if (statusData.data.status === 'COMPLETED' || statusData.data.status === 'FAILED') {
        completed = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(completed).toBe(true);

    // Get full report
    const reportResponse = await request.get(`http://localhost:3001/api/validations/${validationId}`);
    expect(reportResponse.ok()).toBeTruthy();

    const reportData = await reportResponse.json();
    expect(reportData.success).toBe(true);
    expect(reportData.data.id).toBe(validationId);
  });

  test('should get validation history for diagram', async ({ request }) => {
    test.skip(!diagramId, 'No diagram available');

    // Start first validation
    await request.post(`http://localhost:3001/api/diagrams/${diagramId}/validate`);

    // Get history
    const historyResponse = await request.get(`http://localhost:3001/api/diagrams/${diagramId}/validations`);
    expect(historyResponse.ok()).toBeTruthy();

    const historyData = await historyResponse.json();
    expect(historyData.success).toBe(true);
    expect(Array.isArray(historyData.data)).toBe(true);
  });

  test('should return 404 for non-existent validation', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/validations/non-existent-id/status');
    expect(response.status()).toBe(404);
  });

  test('should return 404 for non-existent diagram validation', async ({ request }) => {
    const response = await request.post('http://localhost:3001/api/diagrams/non-existent-id/validate');
    expect(response.status()).toBe(404);
  });
});

test.describe('Validation Integration', () => {
  test('should complete full validation workflow', async ({ request }) => {
    // 1. Create project
    const projectResponse = await request.post('http://localhost:3001/api/projects', {
      data: {
        name: 'Full Workflow Test',
        description: 'Testing complete validation workflow',
      },
    });
    const projectData = await projectResponse.json();
    expect(projectData.success).toBe(true);
    const projectId = projectData.data.id;

    try {
      // 2. Create operation
      const operationResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations`, {
        data: {
          name: 'Workflow Operation',
          type: 'USER_FLOW',
        },
      });
      const operationData = await operationResponse.json();
      expect(operationData.success).toBe(true);
      const operationId = operationData.data.id;

      // 3. Start diagram generation
      const diagramJobResponse = await request.post(`http://localhost:3001/api/projects/${projectId}/operations/${operationId}/diagrams`);
      const diagramJobData = await diagramJobResponse.json();
      expect(diagramJobData.success).toBe(true);
      const jobId = diagramJobData.data.id;

      // 4. Wait for diagram
      let diagramId: string | null = null;
      for (let i = 0; i < 30; i++) {
        const jobStatus = await request.get(`http://localhost:3001/api/diagram-jobs/${jobId}`);
        const jobStatusData = await jobStatus.json();

        if (jobStatusData.data.status === 'COMPLETED') {
          diagramId = jobStatusData.data.diagramId;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (diagramId) {
        // 5. Start validation
        const validationResponse = await request.post(`http://localhost:3001/api/diagrams/${diagramId}/validate`);
        expect(validationResponse.ok()).toBeTruthy();
        const validationData = await validationResponse.json();
        const validationId = validationData.data.validationId;

        // 6. Wait for validation completion
        let validationCompleted = false;
        for (let i = 0; i < 30; i++) {
          const statusResponse = await request.get(`http://localhost:3001/api/validations/${validationId}/status`);
          const statusData = await statusResponse.json();

          if (statusData.data.status === 'COMPLETED' || statusData.data.status === 'FAILED') {
            validationCompleted = true;

            // Verify final status has expected fields
            expect(statusData.data.diagramId).toBe(diagramId);
            expect(statusData.data.totalComponents).toBeGreaterThanOrEqual(0);
            expect(statusData.data.validatedComponents).toBeGreaterThanOrEqual(0);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        expect(validationCompleted).toBe(true);
      }
    } finally {
      // Cleanup
      await request.delete(`http://localhost:3001/api/projects/${projectId}`);
    }
  });
});
