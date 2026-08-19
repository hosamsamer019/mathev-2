import { courseApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface CreateCourseData {
  title: string;
  description?: string;
  category?: string;
  price?: number;
  status?: string;
  country?: string;
  educationLevel?: string;
  gradeLevel?: string;
}

export interface CreateLessonData {
  title: string;
  videoUrl?: string;
  fileUrl?: string;
  duration?: number;
  moduleId?: string;
  courseId: string;
  quizzes?: Array<{
    id?: string;
    timestampSec: number;
    question: string;
    options: string[];
    correctAnswer: string;
  }>;
}

export interface VideoProgressData {
  progress: number;
  watched?: boolean;
  lastTimestamp?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Service ─────────────────────────────────────────────────────────
export const courseService = {
  // ── Courses ──────────────────────────────────────────────────────
  getCourses: (params?: { page?: number; limit?: number }) =>
    courseApi.get<PaginatedResponse<any>>('/', { params }),

  getAvailableCourses: (params?: { page?: number; limit?: number }) =>
    courseApi.get<PaginatedResponse<any>>('/available', { params }),

  enrollCourse: (id: string) =>
    courseApi.post(`/${id}/enroll`),

  getCourseDetails: (id: string) =>
    courseApi.get(`/${id}`),

  createCourse: (data: CreateCourseData) =>
    courseApi.post('/', data),

  deleteCourse: (id: string) =>
    courseApi.delete(`/${id}`),

  updateCourse: (id: string, data: Partial<CreateCourseData>) =>
    courseApi.put(`/${id}`, data),

  // ── Lessons ──────────────────────────────────────────────────────
  getLessons: (params?: Record<string, any>) =>
    courseApi.get('/lessons', { params }),

  getLessonDetails: (id: string) =>
    courseApi.get(`/lessons/${id}`),

  createLesson: (data: CreateLessonData) =>
    courseApi.post('/lessons', data),

  deleteLesson: (id: string) =>
    courseApi.delete(`/lessons/${id}`),

  updateLesson: (id: string, data: Partial<CreateLessonData>) =>
    courseApi.put(`/lessons/${id}`, data),

  // ── Video Progress ───────────────────────────────────────────────
  updateVideoProgress: (lessonId: string, data: VideoProgressData) =>
    courseApi.post(`/lessons/${lessonId}/progress`, data),

  postLessonEvents: (lessonId: string, eventData: any) =>
    courseApi.post(`/lessons/${lessonId}/events`, eventData),

  confirmTeacherCompletion: (lessonId: string, studentId: string) =>
    courseApi.post(`/lessons/${lessonId}/teacher-complete`, { studentId }),

  getStudentVideoAnalytics: (studentId: string) =>
    courseApi.get(`/students/${studentId}/analytics/video`),

  getVideoAnalytics: (lessonId: string) =>
    courseApi.get(`/lessons/${lessonId}/analytics`),

  // ── Lesson Quiz ──────────────────────────────────────────────────
  submitLessonQuiz: (lessonId: string, quizId: string, answer: any) =>
    courseApi.post(`/lessons/${lessonId}/quiz/${quizId}/submit`, { answer }),

  // ── Video Uploads (Phase 10 - Cloudflare R2) ──────────────────
  requestUploadUrl: (data: { filename: string; mimetype: string; fileSize: number }) =>
    courseApi.post('/upload/request-url', data),

  completeUpload: (uploadId: string) =>
    courseApi.post(`/upload/${uploadId}/complete`),

  getUploadStatus: (uploadId: string) =>
    courseApi.get(`/upload/${uploadId}/status`),

  getUploads: () =>
    courseApi.get('/uploads'),
};
