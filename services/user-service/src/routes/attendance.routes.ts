import { Router } from 'express';
import {
  markAttendance,
  bulkMarkAttendance,
  getStudentAttendance,
  getStudentAttendanceById,
  getAttendancePercentage,
  updateAttendanceRecord,
  deleteAttendanceRecord
} from '../controllers/attendance.controller.js';
import { verifyToken, checkRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Student / Self endpoint
router.get('/my-attendance', verifyToken, getStudentAttendance);

// Teacher / Staff / Admin endpoints
router.post('/bulk', verifyToken, checkRole(['admin', 'teacher']), bulkMarkAttendance);
router.post('/', verifyToken, checkRole(['admin', 'teacher']), markAttendance);
router.get('/student/:studentId', verifyToken, getStudentAttendanceById);
router.get('/:studentId/percentage', verifyToken, getAttendancePercentage);
router.put('/:id', verifyToken, checkRole(['admin', 'teacher']), updateAttendanceRecord);
router.delete('/:id', verifyToken, checkRole(['admin', 'teacher']), deleteAttendanceRecord);

export default router;

