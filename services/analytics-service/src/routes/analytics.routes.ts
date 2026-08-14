import { Router } from 'express';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';
import { 
  getAdminAnalytics, 
  getParentAnalytics,
  getParentChildOverview,
  getTeacherAnalytics,
  getStudentOverview,
  getStudentCharts,
  getStudentRecent,
  getStudentReport,
  getRiskAnalytics,
  getAIStats
} from '../controllers/analytics.controller.js';
import { stripeWebhook } from '../controllers/stripe.webhook.js';
import express from 'express';

const router = Router();

// Stripe webhook — must use raw body BEFORE express.json() parses it
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.get('/admin', verifyToken, checkRole(['admin']), getAdminAnalytics);
router.get('/risk', verifyToken, checkRole(['admin', 'teacher']), getRiskAnalytics);
router.get('/ai-stats', verifyToken, checkRole(['admin', 'teacher']), getAIStats);
router.get('/parent', verifyToken, getParentAnalytics);
router.get('/parent/child/:id/overview', verifyToken, getParentChildOverview);
router.get('/teacher/:id/overview', verifyToken, getTeacherAnalytics);

router.get('/student/overview', verifyToken, getStudentOverview);
router.get('/student/charts', verifyToken, getStudentCharts);
router.get('/student/recent', verifyToken, getStudentRecent);
router.get('/report/:studentId', verifyToken, getStudentReport);

export default router;
