import axios from 'axios';

// When VITE_AUTH_API_URL is empty string, use Netlify Function proxy at /api/auth
const AUTH_URL = import.meta.env.VITE_AUTH_API_URL || '/api/auth';
const USER_URL = import.meta.env.VITE_USER_API_URL || '/api/users';
const AI_URL = import.meta.env.VITE_AI_API_URL || '/api/ai';
const COURSE_URL = import.meta.env.VITE_COURSE_API_URL || '/api/courses';
const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_API_URL || '/api/analytics';

export const authApi = axios.create({
  baseURL: AUTH_URL,
  withCredentials: false,
});

export const userApi = axios.create({
  baseURL: USER_URL,
});

export const aiApi = axios.create({
  baseURL: AI_URL,
});

export const courseApi = axios.create({
  baseURL: COURSE_URL,
});

export const analyticsApi = axios.create({
  baseURL: ANALYTICS_URL,
});

// Interceptor to add Token to requests
[userApi, aiApi, courseApi, analyticsApi].forEach(api => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});
