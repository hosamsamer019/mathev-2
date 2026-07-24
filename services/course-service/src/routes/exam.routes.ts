import { Router } from 'express';
import {
  getAllExams,
  getExamsByCourse,
  getExamDetails,
  createExam,
  deleteExam,
  startAttempt,
  submitAttempt
} from '../controllers/exam.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

// All exam routes require authentication
router.use(verifyToken);

router.get('/', getAllExams);
router.post('/', createExam);
router.get('/course/:courseId', getExamsByCourse);
router.get('/:id', getExamDetails);
router.delete('/:id', deleteExam);
router.post('/:id/start', startAttempt);
router.post('/:id/submit', submitAttempt);

export default router;
