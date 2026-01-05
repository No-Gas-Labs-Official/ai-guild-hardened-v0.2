import axios from 'axios';

// Configure base URL based on environment
const BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.nogaslabs.com');

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  // Dashboard
  getDashboardOverview: () => api.get('/api/dashboard/overview'),
  getRepositoryAnalytics: () => api.get('/api/dashboard/repositories/analytics'),
  getAgentPerformance: () => api.get('/api/dashboard/agents/performance'),
  getSystemMetrics: () => api.get('/api/dashboard/system/metrics'),
  getVisualizationData: (type) => api.get(`/api/dashboard/visualizations/${type}`),
  getAlerts: (params) => api.get('/api/dashboard/alerts', { params }),
  acknowledgeAlert: (id) => api.post(`/api/dashboard/alerts/${id}/acknowledge`),
  getTaskStatus: (params) => api.get('/api/dashboard/tasks/status', { params }),
  cancelTask: (id) => api.post(`/api/dashboard/tasks/${id}/cancel`),
  exportDashboardData: (format, type) => api.get(`/api/dashboard/export/${format}`, { 
    params: { type },
    responseType: format === 'csv' ? 'blob' : 'json'
  }),

  // Repositories
  getRepositories: () => api.get('/api/repos'),
  getRepository: (id) => api.get(`/api/repos/${id}`),
  addRepository: (data) => api.post('/api/repos/add', data),
  scanRepository: (id) => api.post(`/api/repos/${id}/scan`),
  getDependencyGraph: (id) => api.get(`/api/repos/${id}/dependencies/graph`),
  getMaintenanceLogs: (id) => api.get(`/api/repos/${id}/logs`),

  // Architecture
  analyzeArchitecture: (id, data) => api.post(`/api/architecture/${id}/analyze`, data),
  getArchitecturePatterns: (id) => api.get(`/api/architecture/${id}/patterns`),
  getUMLData: (id) => api.get(`/api/architecture/${id}/uml`),

  // Maintainer
  maintainRepository: (id) => api.post(`/api/maintainer/${id}/maintain`),
  getMaintenanceStats: () => api.get('/api/maintainer/stats'),

  // Registry
  getPrompts: (params) => api.get('/api/registry/prompts', { params }),
  getPrompt: (id) => api.get(`/api/registry/prompts/${id}`),
  createPrompt: (data) => api.post('/api/registry/prompts', data),
  updatePrompt: (id, data) => api.put(`/api/registry/prompts/${id}`, data),
  createPromptVersion: (id, data) => api.post(`/api/registry/prompts/${id}/version`, data),
  deletePrompt: (id) => api.delete(`/api/registry/prompts/${id}`),
  getPromptVersions: (id) => api.get(`/api/registry/prompts/${id}/versions`),
  getCategories: () => api.get('/api/registry/categories'),
  searchPrompts: (params) => api.get('/api/registry/search', { params }),
  exportRegistry: (params) => api.get('/api/registry/export', { 
    params,
    responseType: 'json'
  }),
  importRegistry: (data) => api.post('/api/registry/import', data),

  // Node roles
  getRoles: () => api.get('/api/registry/roles'),
  getRole: (id) => api.get(`/api/registry/roles/${id}`),
  updateRole: (id, data) => api.put(`/api/registry/roles/${id}`, data),

  // Memory artifacts
  getArtifacts: (params) => api.get('/api/registry/artifacts', { params }),
  getArtifact: (id) => api.get(`/api/registry/artifacts/${id}`),
  createArtifact: (data) => api.post('/api/registry/artifacts', data),

  // Alignment rules
  getAlignmentRules: () => api.get('/api/registry/alignment'),
  updateAlignmentRule: (id, data) => api.put(`/api/registry/alignment/${id}`, data),

  // Prototypes
  generatePrototype: (data) => api.post('/api/prototypes/generate', data),
  getPrototypes: (params) => api.get('/api/prototypes', { params }),
  getPrototype: (id) => api.get(`/api/prototypes/${id}`),
  deployPrototype: (id, data) => api.post(`/api/prototypes/${id}/deploy`, data),
  deletePrototype: (id) => api.delete(`/api/prototypes/${id}`),

  // Agents
  getAgents: () => api.get('/api/agents'),
  getAgent: (id) => api.get(`/api/agents/${id}`),
  updateAgentConfig: (id, data) => api.put(`/api/agents/${id}/config`, data),
  startAgent: (id, data) => api.post(`/api/agents/${id}/start`, data),
  stopAgent: (id) => api.post(`/api/agents/${id}/stop`),
  getAgentLogs: (id, params) => api.get(`/api/agents/${id}/logs`, { params }),
  getWorkflowStatus: () => api.get('/api/agents/workflows/status'),
  createWorkflow: (data) => api.post('/api/agents/workflows/create', data),
  getCoordinationMatrix: () => api.get('/api/agents/coordination/matrix'),

  // CLI
  executeCLICommand: (data) => api.post('/api/cli/execute', data),
  getCLICommands: () => api.get('/api/cli/commands'),

  // Health check
  healthCheck: () => api.get('/health'),
};

// Export default instance for custom requests
export default api;