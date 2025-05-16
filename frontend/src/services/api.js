import axios from 'axios';
import { getApiUrl, DEFAULT_API_URL } from '../config';

// Create a base axios instance with defaults
const api = axios.create({
  baseURL: DEFAULT_API_URL, // Start with default, will be updated
});

// Function to update the base URL
export const updateApiBaseUrl = async () => {
  try {
    const apiUrl = await getApiUrl();
    api.defaults.baseURL = apiUrl;
    console.log(`API base URL set to: ${apiUrl}`);
    return apiUrl;
  } catch (error) {
    console.error('Failed to update API base URL:', error);
    return DEFAULT_API_URL;
  }
};

// Initialize by updating the base URL
updateApiBaseUrl();

// Add a request interceptor to set the authorization header when available
api.interceptors.request.use(
  (config) => {
    // FIXED: Changed from 'authToken' to 'token' to match AuthContext.js
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Adding authorization header with token');
    } else {
      console.log('No token found in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API calls
export const login = async (username, password) => {
  const response = await api.post('/api/auth/login', { username, password });
  return response.data;
};

export const register = async (username, password) => {
  const response = await api.post('/api/auth/register', { username, password });
  return response.data;
};

export const updateGithubCredentials = async (githubUsername, githubEmail, githubToken) => {
  const response = await api.put('/api/auth/me/github-credentials', { 
    githubUsername, 
    githubEmail,
    githubToken 
  });
  return response.data;
};

// Writeups API calls
export const getWriteups = async () => {
  const response = await api.get('/api/writeups');
  return response.data;
};

export const getWriteupById = async (id) => {
  const response = await api.get(`/api/writeups/${id}`);
  return response.data;
};

export const createWriteup = async (writeupData) => {
  const response = await api.post('/api/writeups', writeupData);
  return response.data;
};

export const updateWriteup = async (id, writeupData) => {
  const response = await api.put(`/api/writeups/${id}`, writeupData);
  return response.data;
};

export const deleteWriteup = async (id) => {
  const response = await api.delete(`/api/writeups/${id}`);
  return response.data;
};

export const uploadToGithub = async (writeupId, githubData) => {
  const response = await api.post(`/api/writeups/${writeupId}/upload`, githubData);
  return response.data;
};

export default api;