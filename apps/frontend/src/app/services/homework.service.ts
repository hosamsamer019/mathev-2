import { homeworkApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface HomeworkQuestion {
  id: string | number;
  text: string;
  type: string;
  options?: string[];
  correct?: any;
}

export interface CreateHomeworkData {
  title: string;
  courseId: string;
  questions?: HomeworkQuestion[];
  lessonId?: string | null;
  type?: 'NORMAL' | 'VIDEO_DEPENDENT';
}

export interface SubmitHomeworkData {
  answers?: { questionId: string; selectedOption: any }[];
  grade?: number;
  url?: string;
}

// ─── Service ─────────────────────────────────────────────────────────
export const homeworkService = {
  getHomeworks: (params?: { page?: number; limit?: number }) =>
    homeworkApi.get('/', { params }),

  getHomeworksByCourse: (courseId: string) =>
    homeworkApi.get(`/course/${courseId}`),

  getHomeworkDetails: (id: string) =>
    homeworkApi.get(`/${id}`),

  createHomework: (data: CreateHomeworkData) =>
    homeworkApi.post('/', data),

  updateHomework: (id: string, data: CreateHomeworkData) =>
    homeworkApi.put(`/${id}`, data),

  deleteHomework: (id: string) =>
    homeworkApi.delete(`/${id}`),

  submitHomework: (id: string, data: SubmitHomeworkData) =>
    homeworkApi.post(`/${id}/submit`, data),

  getStudentSubmission: (id: string) =>
    homeworkApi.get(`/${id}/submission`),

  // NOTE: PUT /homework/:id does NOT exist — homework cannot be edited.
  // NOTE: DELETE /homework/:id route is NOT wired — controller exists but route missing.
  // NOTE: POST /homework/questions is a STUB — returns static message.
};
