import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  date: z.string().datetime().optional()
});

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = markAttendanceSchema.parse(req.body);
    
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole === 'TEACHER') {
      const isEnrolled = await db.courseEnrollment.findFirst({
        where: {
          studentId: validatedData.studentId,
          course: { teacherId: req.user?.userId }
        }
      });
      if (!isEnrolled) {
        return res.status(403).json({ message: 'Forbidden: Student is not enrolled in your courses' });
      }
    } else if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    const attendance = await db.attendance.create({
      data: {
        studentId: validatedData.studentId,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        status: validatedData.status
      }
    });

    const statusMap: Record<string, string> = {
      'PRESENT': 'حاضر',
      'ABSENT': 'غائب',
      'LATE': 'متأخر'
    };

    await db.notification.create({
      data: {
        userId: validatedData.studentId,
        title: 'تسجيل الحضور',
        message: `تم تسجيلك كـ "${statusMap[validatedData.status] || validatedData.status}" في المحاضرة`,
        type: 'info'
      }
    });
    
    res.status(201).json(attendance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const records = await db.attendance.findMany({
      where: { studentId: userId },
      orderBy: { date: 'desc' }
    });
    
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

export const getAttendancePercentage = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { userId } = req.user!;
    const role = (req.user!.role || '').toUpperCase();

    // Authorization Check (Enrollment Pattern from Phase 4)
    if (role === 'STUDENT_ONLINE' || role === 'STUDENT_CENTER' || role === 'ONLINE_STUDENT' || role === 'CENTER_STUDENT') {
      if (studentId !== userId) {
        return res.status(403).json({ message: 'Access denied. You can only view your own attendance.' });
      }
    } else if (role === 'TEACHER') {
      // Check if this student is enrolled in any of this teacher's courses
      const enrollments = await db.courseEnrollment.findFirst({
        where: {
          studentId: studentId,
          course: { teacherId: userId }
        }
      });
      if (!enrollments) {
        return res.status(403).json({ message: 'Access denied. Student is not enrolled in your courses.' });
      }
    } else if (role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const records = await db.attendance.findMany({
      where: { studentId }
    });

    if (records.length === 0) {
      return res.json({ percentage: null, message: 'لا توجد بيانات' });
    }

    const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const percentage = Math.round((presentCount / records.length) * 100);

    res.json({ percentage, totalSessions: records.length, present: presentCount });
  } catch (error: any) {
    res.status(500).json({ message: 'Error calculating attendance percentage', error: error.message });
  }
};
