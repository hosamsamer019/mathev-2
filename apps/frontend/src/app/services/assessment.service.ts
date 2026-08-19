import { assessmentApi } from './api';

export const assessmentService = {
  getAssessmentReview: (assessmentId: string, attemptId: string) =>
    assessmentApi.get(`/${assessmentId}/attempts/${attemptId}/review`),
};
