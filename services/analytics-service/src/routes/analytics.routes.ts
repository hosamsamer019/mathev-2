import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { 
  getAdminAnalytics, 
  getParentAnalytics,
  getParentChildOverview,
  getTeacherAnalytics,
  getStudentOverview,
  getStudentCharts,
  getStudentRecent
} from '../controllers/analytics.controller.js';
import { stripeWebhook } from '../controllers/stripe.webhook.js';
import express from 'express';

const router = Router();

// Stripe webhook — must use raw body BEFORE express.json() parses it
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.get('/admin', verifyToken, getAdminAnalytics);
router.get('/parent', verifyToken, getParentAnalytics);
router.get('/parent/child/:id/overview', verifyToken, getParentChildOverview);
router.get('/teacher/:id/overview', verifyToken, getTeacherAnalytics);

router.get('/student/overview', verifyToken, getStudentOverview);
router.get('/student/charts', verifyToken, getStudentCharts);
router.get('/student/recent', verifyToken, getStudentRecent);

export default router;
