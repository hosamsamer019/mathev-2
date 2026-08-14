import { examApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface ExamQuestion {
  id: string | number;
  text: string;
  type: string;
  options?: string[];
  correct?: any;
}

export interface CreateExamData {
  title: string;
  courseId: string;
  duration?: number;
  requiresCamera?: boolean;
  startTime?: string;
  endTime?: string;
  randomization?: boolean;
  passingScore?: number;
  questions?: ExamQuestion[];
}

export interface SubmitAnswerData {
  questionId: string;
  selectedOption: any;
}


// ─── Service ─────────────────────────────────────────────────────────
export const examService = {
  getExams: (params?: { page?: number; limit?: number }) =>
    examApi.get('/', { params }),

  getExamsByCourse: (courseId: string) =>
    examApi.get(`/course/${courseId}`),

  getExamDetails: (id: string) =>
    examApi.get(`/${id}`),

  createExam: (data: CreateExamData) =>
    examApi.post('/', data),

  updateExam: (id: string, data: CreateExamData) =>
    examApi.put(`/${id}`, data),

  deleteExam: (id: string) =>
    examApi.delete(`/${id}`),

  startAttempt: (examId: string) =>
    examApi.post(`/${examId}/start`),

  submitAttempt: (examId: string, answers: SubmitAnswerData[]) =>
    examApi.post(`/${examId}/submit`, { answers }),

  syncAttempt: (examId: string, answers: SubmitAnswerData[]) =>
    examApi.post(`/${examId}/sync`, { answers }),

  reportViolation: (examId: string, type: string) =>
    examApi.post(`/${examId}/violation`, { type }),
};
