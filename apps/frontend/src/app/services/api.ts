import axios from 'axios';

const AUTH_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:4001/api/auth';
const USER_URL = import.meta.env.VITE_USER_API_URL || 'http://localhost:4002/api/users';
const AI_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:4003/api/ai';
const COURSE_URL = import.meta.env.VITE_COURSE_API_URL || 'http://localhost:4004/api/courses';
const EXAM_URL = import.meta.env.VITE_EXAM_API_URL || 'http://localhost:4004/api/exams';
const HOMEWORK_URL = import.meta.env.VITE_HOMEWORK_API_URL || 'http://localhost:4004/api/homework';
const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:4005/api/analytics';

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

export const examApi = axios.create({
  baseURL: EXAM_URL,
});

export const homeworkApi = axios.create({
  baseURL: HOMEWORK_URL,
});

export const analyticsApi = axios.create({
  baseURL: ANALYTICS_URL,
});

// Interceptor to add Token to requests
[userApi, aiApi, courseApi, examApi, homeworkApi, analyticsApi].forEach(api => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
});
