import { Router } from 'express';
import {
  getCourses,
  getCourseDetails,
  createCourse,
  createLesson,
  getLessons,
  getLessonDetails,
  deleteCourse,
  deleteLesson,
  updateVideoProgress,
  getVideoAnalytics,
  submitLessonQuiz
} from '../controllers/course.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, getCourses);
router.get('/lessons', getLessons);
router.get('/lessons/:id', verifyToken, getLessonDetails);
router.get('/:id', verifyToken, getCourseDetails);
router.post('/lessons/:id/quiz/:quizId/submit', verifyToken, submitLessonQuiz);

// Course Management (restricted to teachers and admins)
router.post('/', verifyToken, checkRole(['teacher', 'admin']), createCourse);
router.post('/lessons', verifyToken, checkRole(['teacher', 'admin']), createLesson);

router.delete('/:id', verifyToken, deleteCourse);
router.delete('/lessons/:id', verifyToken, checkRole(['teacher', 'admin']), deleteLesson);

// Video Progress Routes
router.post('/lessons/:id/progress', verifyToken, updateVideoProgress);
router.get('/lessons/:id/analytics', verifyToken, checkRole(['teacher', 'admin']), getVideoAnalytics);

export default router;
