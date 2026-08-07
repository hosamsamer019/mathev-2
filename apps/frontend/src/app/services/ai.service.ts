import { aiApi } from './api';

export const aiService = {
  chat: (message: string, context?: any) =>
    aiApi.post('/chat', { message, context }),

  solveMath: (imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return aiApi.post('/solve', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  generateQuestions: (params: any) =>
    aiApi.post('/generate-questions', params),
};
