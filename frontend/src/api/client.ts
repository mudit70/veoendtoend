import type { Project, Document, ApiResponse, FolderImportRequest, RepoImportRequest, ImportResult, Operation, Job } from '@veoendtoend/shared';

export interface DiscoveryJob extends Job {
  projectId: string;
}

const API_BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const apiClient = {
  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return request('/health');
  },

  // Projects
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return request('/projects');
  },

  async getProject(id: string): Promise<ApiResponse<Project>> {
    return request(`/projects/${id}`);
  },

  async createProject(data: {
    name: string;
    description?: string;
  }): Promise<ApiResponse<Project>> {
    return request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(
    id: string,
    data: { name: string; description?: string }
  ): Promise<ApiResponse<Project>> {
    return request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return request(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  // Documents
  async getDocuments(projectId: string): Promise<ApiResponse<Document[]>> {
    return request(`/documents/project/${projectId}`);
  },

  async getDocument(id: string): Promise<ApiResponse<Document>> {
    return request(`/documents/${id}`);
  },

  async uploadDocument(
    projectId: string,
    file: File
  ): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents/project/${projectId}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  },

  async uploadDocumentsBatch(
    projectId: string,
    files: File[]
  ): Promise<ApiResponse<ImportResult>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/documents/project/${projectId}/batch`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Batch upload failed');
    }

    return data;
  },

  async importFromFolders(
    projectId: string,
    request: FolderImportRequest
  ): Promise<ApiResponse<ImportResult>> {
    return await fetch(`${API_BASE_URL}/documents/project/${projectId}/from-folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Folder import failed');
      }
      return data;
    });
  },

  async importFromRepos(
    projectId: string,
    request: RepoImportRequest
  ): Promise<ApiResponse<ImportResult>> {
    return await fetch(`${API_BASE_URL}/documents/project/${projectId}/from-repos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Repository import failed');
      }
      return data;
    });
  },

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return request(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteDocumentsBySource(
    projectId: string,
    sourceName: string
  ): Promise<ApiResponse<{ message: string }>> {
    return request(`/documents/project/${projectId}/source/${encodeURIComponent(sourceName)}`, {
      method: 'DELETE',
    });
  },

  // Discovery
  async startDiscovery(projectId: string): Promise<ApiResponse<DiscoveryJob>> {
    return request(`/projects/${projectId}/discover`, {
      method: 'POST',
    });
  },

  async getDiscoveryJob(jobId: string): Promise<ApiResponse<DiscoveryJob>> {
    return request(`/discovery/jobs/${jobId}`);
  },

  async getLatestDiscoveryJob(projectId: string): Promise<ApiResponse<DiscoveryJob>> {
    return request(`/projects/${projectId}/discovery/latest`);
  },

  // Operations
  async getOperations(projectId: string, filters?: { status?: string; type?: string }): Promise<ApiResponse<Operation[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    const queryString = params.toString();
    return request(`/projects/${projectId}/operations${queryString ? `?${queryString}` : ''}`);
  },

  async getOperation(id: string): Promise<ApiResponse<Operation>> {
    return request(`/operations/${id}`);
  },

  async createOperation(projectId: string, data: {
    name: string;
    description?: string;
    type: Operation['type'];
    sourceDocumentIds?: string[];
  }): Promise<ApiResponse<Operation>> {
    return request(`/projects/${projectId}/operations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateOperation(id: string, data: Partial<{
    name: string;
    description: string;
    type: Operation['type'];
    status: Operation['status'];
  }>): Promise<ApiResponse<Operation>> {
    return request(`/operations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteOperation(id: string): Promise<ApiResponse<void>> {
    return request(`/operations/${id}`, {
      method: 'DELETE',
    });
  },

  async confirmOperation(id: string): Promise<ApiResponse<Operation>> {
    return request(`/operations/${id}/confirm`, {
      method: 'POST',
    });
  },

  async rejectOperation(id: string): Promise<ApiResponse<Operation>> {
    return request(`/operations/${id}/reject`, {
      method: 'POST',
    });
  },
};
