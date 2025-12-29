import type { Project, Document, ApiResponse } from '@veoendtoend/shared';

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

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    return request(`/documents/${id}`, {
      method: 'DELETE',
    });
  },
};
