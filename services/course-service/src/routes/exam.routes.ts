import { Router } from 'express';
import {
  getAllExams,
  getExamsByCourse,
  getExamDetails,
  createExam,
  updateExam,
  deleteExam,
  startAttempt,
  submitAttempt,
  syncAttempt,
  reportViolation
} from '../controllers/exam.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

// All exam routes require authentication
router.use(verifyToken);

router.get('/', getAllExams);
router.post('/', checkRole(['teacher', 'admin']), createExam);
router.get('/course/:courseId', getExamsByCourse);
router.get('/:id', getExamDetails);
router.put('/:id', checkRole(['teacher', 'admin']), updateExam);
router.delete('/:id', checkRole(['teacher', 'admin']), deleteExam);
router.post('/:id/start', startAttempt);
router.post('/:id/submit', submitAttempt);
router.post('/:id/sync', syncAttempt);
router.post('/:id/violation', reportViolation);

export default router;
