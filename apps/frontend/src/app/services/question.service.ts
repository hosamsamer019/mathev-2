import { questionApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface CreateQuestionData {
  text: string;
  type?: string;
  options: string[];
  correctAnswer: number;
  tag?: string;
}

// ─── Service ─────────────────────────────────────────────────────────
export const questionService = {
  getQuestions: (params?: { page?: number; limit?: number; tag?: string }) =>
    questionApi.get('/', { params }),

  createQuestion: (data: CreateQuestionData) =>
    questionApi.post('/', data),

  updateQuestion: (id: string, data: CreateQuestionData) =>
    questionApi.put(`/${id}`, data),

  deleteQuestion: (id: string) =>
    questionApi.delete(`/${id}`),
};
