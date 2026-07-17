import { Router } from 'express';
import {
  getCourses,
  getCourseDetails,
  createCourse,
  createModule,
  createLesson,
  updateProgress
} from '../controllers/course.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getCourses);
router.get('/:id', getCourseDetails);

// Course Management (restricted to teachers and admins)
router.post('/', verifyToken, checkRole(['teacher', 'admin']), createCourse);
router.post('/modules', verifyToken, checkRole(['teacher', 'admin']), createModule);
router.post('/lessons', verifyToken, checkRole(['teacher', 'admin']), createLesson);

// Student lesson progress tracking
router.post('/progress', verifyToken, updateProgress);

export default router;
