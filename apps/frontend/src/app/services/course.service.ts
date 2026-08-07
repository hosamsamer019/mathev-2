import { courseApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface CreateCourseData {
  title: string;
  description?: string;
  category?: string;
}

export interface CreateLessonData {
  title: string;
  videoUrl?: string;
  fileUrl?: string;
  duration?: number;
  moduleId?: string;
  courseId: string;
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

  getCourseDetails: (id: string) =>
    courseApi.get(`/${id}`),

  createCourse: (data: CreateCourseData) =>
    courseApi.post('/', data),

  deleteCourse: (id: string) =>
    courseApi.delete(`/${id}`),

  // NOTE: PUT /courses/:id does NOT exist in the backend.
  // updateCourse is intentionally omitted.

  // ── Lessons ──────────────────────────────────────────────────────
  getLessons: (params?: Record<string, any>) =>
    courseApi.get('/lessons', { params }),

  getLessonDetails: (id: string) =>
    courseApi.get(`/lessons/${id}`),

  createLesson: (data: CreateLessonData) =>
    courseApi.post('/lessons', data),

  deleteLesson: (id: string) =>
    courseApi.delete(`/lessons/${id}`),

  // NOTE: PUT /courses/lessons/:id does NOT exist in the backend.
  // updateLesson is intentionally omitted.

  // ── Video Progress ───────────────────────────────────────────────
  updateVideoProgress: (lessonId: string, data: VideoProgressData) =>
    courseApi.post(`/lessons/${lessonId}/progress`, data),

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
};
