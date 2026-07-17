import { Router } from 'express';
import {
  getExamsByCourse,
  getExamDetails,
  startAttempt,
  syncDraft,
  logViolation,
  submitAttempt
} from '../controllers/exam.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All exam routes require authentication
router.use(verifyToken);

router.get('/course/:courseId', getExamsByCourse);
router.get('/:id', getExamDetails);
router.post('/:id/start', startAttempt);
router.post('/:id/sync', syncDraft);
router.post('/:id/violation', logViolation);
router.post('/:id/submit', submitAttempt);

export default router;
