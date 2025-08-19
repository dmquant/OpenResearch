/**
 * Worker API Service - handles all communication with Cloudflare Worker backend
 */
class WorkerApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_WORKER_API_URL || 'http://localhost:8787';
    this.apiToken = import.meta.env.VITE_WORKER_API_TOKEN;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication header if token is available
    if (this.apiToken) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.apiToken}`;
    }
  }

  /**
   * Make HTTP request to worker
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.defaultHeaders,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Worker API request failed:', error);
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.request('/health');
  }

  /**
   * Check if API token is configured
   */
  isAuthenticated() {
    return !!this.apiToken;
  }

  /**
   * Test authentication by making an authenticated request
   */
  async testAuth() {
    try {
      const projects = await this.getAllProjects();
      return { authenticated: true, projectCount: projects.length };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }

  // Project endpoints
  async getAllProjects() {
    return this.request('/api/projects');
  }

  async createProject(projectData) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async getProject(projectId) {
    return this.request(`/api/projects/${projectId}`);
  }

  // Research plan endpoints
  async createResearchPlan(projectId, planData) {
    return this.request(`/api/projects/${projectId}/plan`, {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  // Store plan (new infrastructure API)
  async storePlan(projectId, planData) {
    return this.request(`/api/projects/${projectId}/plan`, {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  // Get stored plan
  async getPlan(projectId) {
    return this.request(`/api/projects/${projectId}/plan`);
  }

  // Execution endpoints
  async executeProject(projectId) {
    return this.request(`/api/projects/${projectId}/execute`, {
      method: 'POST',
    });
  }

  // Cards endpoints
  async getProjectCards(projectId) {
    return this.request(`/api/projects/${projectId}/cards`);
  }

  // Store card (new infrastructure API)
  async storeCard(projectId, cardData) {
    return this.request(`/api/projects/${projectId}/cards`, {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  }

  // Store report (new infrastructure API)
  async storeReport(projectId, reportData) {
    return this.request(`/api/projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // Semantic search
  async searchCards(projectId, query, limit = 10) {
    return this.request(`/api/projects/${projectId}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  // Get project reports
  async getProjectReports(projectId) {
    return this.request(`/api/projects/${projectId}/reports`);
  }

  // Reports endpoints
  async generateReport(projectId, reportData) {
    return this.request(`/api/projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // Global search across all projects
  async globalSearch(query, limit = 20) {
    return this.request('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  // Get specific report
  async getReport(projectId, reportId) {
    return this.request(`/api/projects/${projectId}/reports/${reportId}`);
  }

  // Update report
  async updateReport(projectId, reportId, reportData) {
    return this.request(`/api/projects/${projectId}/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(reportData),
    });
  }

  // Export endpoints
  async exportProject(projectId) {
    return this.request(`/api/projects/${projectId}/export`);
  }
}

export const workerApiService = new WorkerApiService();