import axios from 'axios';

// API base URL - change this for production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ AUTH API ============

export const authAPI = {
  // Register new user
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Google OAuth login
  googleLogin: async (credential) => {
    console.log('API: Calling Google OAuth endpoint...');
    console.log('API: Base URL:', api.defaults.baseURL);
    console.log('API: Full URL will be:', api.defaults.baseURL + '/auth/google');
    const response = await api.post('/auth/google', { credential });
    console.log('API: Google OAuth response received:', response.data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// ============ ANALYZE API ============

export const analyzeAPI = {
  // Analyze news content
  analyze: async (content, contentType = 'text') => {
    const payload = { content, contentType };
    if (contentType === 'url') {
      payload.url = content;
      payload.content = '';
    }
    const response = await api.post('/analyze', payload);
    return response.data;
  },

  // Get analysis history (requires auth)
  getHistory: async (page = 1, limit = 10) => {
    const response = await api.get(`/analyze/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get single analysis
  getAnalysis: async (id) => {
    const response = await api.get(`/analyze/${id}`);
    return response.data;
  },

  // Delete analysis
  deleteAnalysis: async (id) => {
    const response = await api.delete(`/analyze/${id}`);
    return response.data;
  }
};

// ============ TRENDING API ============

export const trendingAPI = {
  // Get trending news with analysis
  getTrending: async () => {
    const response = await api.get('/trending');
    return response.data;
  },

  // Force refresh trending news
  refresh: async (query) => {
    const response = await api.post('/trending/refresh', { query });
    return response.data;
  }
};

// ============ STREAM API ============

export const streamAPI = {
  // Stream realtime ML analysis from backend proxy
  getStream: async (query = 'misinformation', pageSize = 10) => {
    const response = await api.post('/stream', { query, page_size: pageSize });
    return response.data;
  }
};

export const realtimeAPI = {
  // Get realtime service status via backend proxy
  getStatus: async () => {
    const response = await api.get('/realtime/status');
    return response.data;
  }
};

// ============ ML API ============

export const mlAPI = {
  // Get ML service status via backend proxy
  getStatus: async () => {
    const response = await api.get('/realtime/status');
    return response.data;
  },
  // Get detailed model info (vocab_size, uptime, feature_pipeline)
  getModelInfo: async () => {
    const response = await api.get('/ml/info');
    return response.data;
  }
};

export default api;
