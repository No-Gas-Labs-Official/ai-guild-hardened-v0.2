import api from './apiService';

export const authService = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  // Register new user
  register: async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get user data');
    }
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const response = await api.post('/api/auth/refresh');
      return response.data.token;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Token refresh failed');
    }
  },

  // Logout user
  logout: async () => {
    try {
      // In a real app, you might want to invalidate the token on the server
      // For now, just remove it from local storage
      return Promise.resolve();
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Logout failed');
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('auth_token');
  },

  // Store token
  setToken: (token) => {
    localStorage.setItem('auth_token', token);
  },

  // Remove token
  removeToken: () => {
    localStorage.removeItem('auth_token');
  },

  // Decode JWT token (simple implementation)
  decodeToken: (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (error) {
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired: (token) => {
    const decoded = authService.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() >= decoded.exp * 1000;
  },

  // Get user role from token
  getUserRole: () => {
    const token = authService.getToken();
    if (!token) return null;
    
    const decoded = authService.decodeToken(token);
    return decoded?.role || 'user';
  },

  // Check if user has admin role
  isAdmin: () => {
    return authService.getUserRole() === 'admin';
  },
};