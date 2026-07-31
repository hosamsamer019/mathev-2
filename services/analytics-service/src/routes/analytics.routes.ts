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

const router = Router();

router.get('/admin', verifyToken, getAdminAnalytics);
router.get('/parent', verifyToken, getParentAnalytics);
router.get('/parent/child/:id/overview', verifyToken, getParentChildOverview);
router.get('/teacher/:id/overview', verifyToken, getTeacherAnalytics);

router.get('/student/overview', verifyToken, getStudentOverview);
router.get('/student/charts', verifyToken, getStudentCharts);
router.get('/student/recent', verifyToken, getStudentRecent);

export default router;
