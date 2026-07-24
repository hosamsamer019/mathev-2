import { Router } from 'express';
import { markAttendance, getStudentAttendance } from '../controllers/attendance.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyToken, checkRole(['admin', 'teacher']), markAttendance);
router.get('/my-attendance', verifyToken, getStudentAttendance);

export default router;
