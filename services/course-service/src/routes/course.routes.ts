import { Router } from 'express';
import {
  getCourses,
  getAvailableCourses,
  enrollCourse,
  getCourseDetails,
  createCourse,
  updateCourse,
  createLesson,
  getLessons,
  getLessonDetails,
  deleteCourse,
  deleteLesson,
  updateVideoProgress,
  getVideoAnalytics,
  submitLessonQuiz,
  getUploads
} from '../controllers/course.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, getCourses);
router.get('/available', verifyToken, getAvailableCourses);
router.post('/:id/enroll', verifyToken, enrollCourse);
router.get('/lessons', getLessons);
router.get('/lessons/:id', verifyToken, getLessonDetails);
router.get('/:id', verifyToken, getCourseDetails);
router.post('/lessons/:id/quiz/:quizId/submit', verifyToken, submitLessonQuiz);

// Course Management (restricted to teachers and admins)
router.post('/', verifyToken, checkRole(['teacher', 'admin']), createCourse);
router.put('/:id', verifyToken, checkRole(['teacher', 'admin']), updateCourse);
router.post('/lessons', verifyToken, checkRole(['teacher', 'admin']), createLesson);
router.get('/uploads', verifyToken, checkRole(['teacher', 'admin']), getUploads);

router.delete('/:id', verifyToken, checkRole(['admin']), deleteCourse);
router.delete('/lessons/:id', verifyToken, checkRole(['teacher', 'admin']), deleteLesson);

// Video Progress Routes
router.post('/lessons/:id/progress', verifyToken, updateVideoProgress);
router.get('/lessons/:id/analytics', verifyToken, checkRole(['teacher', 'admin']), getVideoAnalytics);

export default router;
