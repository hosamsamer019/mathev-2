import { Router } from 'express';
import { markAttendance, getStudentAttendance, getAttendancePercentage } from '../controllers/attendance.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyToken, checkRole(['admin', 'teacher']), markAttendance);
router.get('/my-attendance', verifyToken, getStudentAttendance);
router.get('/:studentId/percentage', verifyToken, getAttendancePercentage);

export default router;
