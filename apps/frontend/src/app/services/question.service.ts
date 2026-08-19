import { questionApi } from './api';

// ─── Types ───────────────────────────────────────────────────────────
export interface CreateQuestionData {
  text: string;
  type?: string;
  options: string[];
  correctAnswer: number;
  tag?: string;
  academicLevel?: string;
  mathExpression?: string | null;
  diagram?: any | null;
  solutionSteps?: string[];
  given?: string[] | null;
  required?: string | null;
  explanation?: string;
  solutionExplanation?: string | null;
  generationLogic?: {
    questionDesign: string;
    mathematicalMethod: string;
    difficultyReason: string;
    learningObjective: string;
  } | null;
  validationStatus?: string;
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
