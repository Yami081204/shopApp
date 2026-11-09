import axios from 'axios';
import { API_URL, TOKEN_KEY } from './config';

// Create axios instance
const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor for adding auth token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request setup failed:', error instanceof Error ? error.message : 'Unknown request error');
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;