import { Router } from 'express';
import {
  getAllHomeworks,
  getHomeworksByCourse,
  getHomeworkDetails,
  createHomework,
  updateHomework,
  deleteHomework,
  addQuestion,
  submitHomework,
  getStudentSubmission
} from '../controllers/homework.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Public / Student accessible GET routes
router.get('/', verifyToken, getAllHomeworks);
router.get('/course/:courseId', verifyToken, getHomeworksByCourse);
router.get('/:id', verifyToken, getHomeworkDetails);

// Student submission routes
router.post('/:id/submit', verifyToken, submitHomework);
router.get('/:id/submission', verifyToken, getStudentSubmission);

// Admin / Teacher Management routes
router.post('/', verifyToken, checkRole(['teacher', 'admin']), createHomework);
router.put('/:id', verifyToken, checkRole(['teacher', 'admin']), updateHomework);
router.delete('/:id', verifyToken, checkRole(['teacher', 'admin']), deleteHomework);
router.post('/questions', verifyToken, checkRole(['teacher', 'admin']), addQuestion);

export default router;
