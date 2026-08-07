import { homeworkApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface CreateHomeworkData {
  title: string;
  courseId: string;
  questions?: HomeworkQuestion[];
}

export interface HomeworkQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correct?: any;
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

  submitHomework: (id: string, data: SubmitHomeworkData) =>
    homeworkApi.post(`/${id}/submit`, data),

  getStudentSubmission: (id: string) =>
    homeworkApi.get(`/${id}/submission`),

  // NOTE: PUT /homework/:id does NOT exist — homework cannot be edited.
  // NOTE: DELETE /homework/:id route is NOT wired — controller exists but route missing.
  // NOTE: POST /homework/questions is a STUB — returns static message.
};
