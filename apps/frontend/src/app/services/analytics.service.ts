import { analyticsApi } from './api';

// ─── Service ─────────────────────────────────────────────────────────
export const analyticsService = {
  // ── Admin ────────────────────────────────────────────────────────
  getAdminAnalytics: () =>
    analyticsApi.get('/admin'),

  // ── Teacher ──────────────────────────────────────────────────────
  getTeacherAnalytics: (teacherId: string) =>
    analyticsApi.get(`/teacher/${teacherId}/overview`),

  // ── Student ──────────────────────────────────────────────────────
  getStudentOverview: () =>
    analyticsApi.get('/student/overview'),

  getStudentCharts: () =>
    analyticsApi.get('/student/charts'),

  getStudentRecent: () =>
    analyticsApi.get('/student/recent'),

  // ── Parent ───────────────────────────────────────────────────────
  getParentAnalytics: () =>
    analyticsApi.get('/parent'),

  getParentChildOverview: (childId: string) =>
    analyticsApi.get(`/parent/child/${childId}/overview`),
};
