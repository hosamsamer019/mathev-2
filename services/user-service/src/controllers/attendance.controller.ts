import { Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  date: z.string().optional()
});

const updateAttendanceSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']).optional(),
  date: z.string().optional()
});

const bulkMarkAttendanceSchema = z.object({
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE'])
  })).min(1),
  date: z.string().optional()
});

const statusMapArabic: Record<string, string> = {
  'PRESENT': 'حاضر',
  'ABSENT': 'غائب',
  'LATE': 'متأخر'
};

/**
 * Normalizes any date string or Date object to the UTC day boundaries (00:00:00 to 23:59:59.999)
 * to ensure consistent date-only uniqueness and prevent timezone shifting.
 */
function normalizeDateRange(dateInput?: string | Date): { dayStart: Date; dayEnd: Date } {
  let year: number, month: number, day: number;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const parts = dateInput.trim().split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    const parsed = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(parsed.getTime())) {
      throw new Error('Invalid date format');
    }
    year = parsed.getUTCFullYear();
    month = parsed.getUTCMonth();
    day = parsed.getUTCDate();
  }
  const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  return { dayStart, dayEnd };
}

/**
 * Helper to verify teacher/admin authorization for a student
 */
async function verifyTeacherOrAdminAccess(requesterId: string, requesterRole: string, studentId: string): Promise<boolean> {
  const upperRole = requesterRole.toUpperCase();
  if (upperRole === 'ADMIN') return true;

  if (upperRole === 'TEACHER') {
    // 1. Check if student is enrolled in any course taught by this teacher
    const courseEnrollment = await db.courseEnrollment.findFirst({
      where: {
        studentId,
        course: { teacherId: requesterId }
      }
    });
    if (courseEnrollment) return true;

    // 2. Check if student belongs to teacher's center group
    const teacher = await db.user.findUnique({
      where: { id: requesterId },
      select: { centerGroupId: true }
    });
    if (teacher?.centerGroupId) {
      const studentInGroup = await db.user.findFirst({
        where: { id: studentId, centerGroupId: teacher.centerGroupId }
      });
      if (studentInGroup) return true;
    }

    return false;
  }

  return false;
}

/**
 * Calculate attendance statistics summary
 */
function calculateAttendanceSummary(records: any[]) {
  const totalSessions = records.length;
  const presentCount = records.filter(r => r.status === 'PRESENT').length;
  const absentCount = records.filter(r => r.status === 'ABSENT').length;
  const lateCount = records.filter(r => r.status === 'LATE').length;
  const percentage = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 0;

  return {
    totalSessions,
    presentCount,
    absentCount,
    lateCount,
    percentage: totalSessions > 0 ? percentage : null
  };
}

/**
 * POST /api/attendance
 * Mark or upsert attendance for a single student on a given date.
 */
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = markAttendanceSchema.parse(req.body);
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const isAuthorized = await verifyTeacherOrAdminAccess(requesterId, requesterRole, validatedData.studentId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: Student is not enrolled in your courses or classes' });
    }

    const { dayStart, dayEnd } = normalizeDateRange(validatedData.date);

    // Check if attendance record already exists for this student on this date
    const existing = await db.attendance.findFirst({
      where: {
        studentId: validatedData.studentId,
        date: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    });

    let attendance;
    let statusCode = 201;

    if (existing) {
      // Idempotent update of existing day record
      attendance = await db.attendance.update({
        where: { id: existing.id },
        data: {
          status: validatedData.status,
          date: dayStart
        }
      });
      statusCode = 200;
    } else {
      // Create new attendance record
      attendance = await db.attendance.create({
        data: {
          studentId: validatedData.studentId,
          date: dayStart,
          status: validatedData.status
        }
      });
      statusCode = 201;
    }

    const statusArabic = statusMapArabic[validatedData.status] || validatedData.status;

    // Send notification to student
    try {
      await db.notification.create({
        data: {
          userId: validatedData.studentId,
          title: 'تسجيل الحضور',
          message: `تم تسجيلك كـ "${statusArabic}" في الحصة بتاريخ ${dayStart.toLocaleDateString('ar-EG')}`,
          type: 'info'
        }
      });
    } catch (notifErr) {
      // Non-blocking notification failure
    }

    res.status(statusCode).json(attendance);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
};

/**
 * GET /api/attendance/my-attendance
 * Retrieve attendance history and summary for the authenticated student.
 */
export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const records = await db.attendance.findMany({
      where: { studentId: userId },
      orderBy: { date: 'desc' }
    });

    const summary = calculateAttendanceSummary(records);

    res.json({
      data: records,
      summary
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

/**
 * GET /api/attendance/student/:studentId
 * Retrieve attendance history and summary for a specific student (Teacher / Admin / Parent).
 */
export const getStudentAttendanceById = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    if (requesterRole.includes('STUDENT')) {
      if (studentId !== requesterId) {
        return res.status(403).json({ message: 'Access denied: You can only view your own attendance' });
      }
    } else if (requesterRole === 'PARENT') {
      const parentUser = await db.user.findFirst({
        where: { id: requesterId, children: { some: { id: studentId } } }
      });
      if (!parentUser) {
        return res.status(403).json({ message: 'Access denied: Student is not your registered child' });
      }
    } else {
      const isAuthorized = await verifyTeacherOrAdminAccess(requesterId, requesterRole, studentId);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Access denied: Student is not in your courses or classes' });
      }
    }

    const records = await db.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' }
    });

    const summary = calculateAttendanceSummary(records);

    res.json({
      data: records,
      summary
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching student attendance', error: error.message });
  }
};

/**
 * GET /api/attendance/:studentId/percentage
 * Legacy / backward-compatible percentage endpoint.
 */
export const getAttendancePercentage = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    if (requesterRole.includes('STUDENT')) {
      if (studentId !== requesterId) {
        return res.status(403).json({ message: 'Access denied. You can only view your own attendance.' });
      }
    } else if (requesterRole === 'PARENT') {
      const parentUser = await db.user.findFirst({
        where: { id: requesterId, children: { some: { id: studentId } } }
      });
      if (!parentUser) {
        return res.status(403).json({ message: 'Access denied: Student is not your child' });
      }
    } else {
      const isAuthorized = await verifyTeacherOrAdminAccess(requesterId, requesterRole, studentId);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Access denied. Student is not enrolled in your courses.' });
      }
    }

    const records = await db.attendance.findMany({
      where: { studentId }
    });

    if (records.length === 0) {
      return res.json({ percentage: null, message: 'لا توجد بيانات' });
    }

    const summary = calculateAttendanceSummary(records);

    res.json({
      percentage: summary.percentage,
      totalSessions: summary.totalSessions,
      present: summary.presentCount + summary.lateCount,
      presentCount: summary.presentCount,
      absentCount: summary.absentCount,
      lateCount: summary.lateCount
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error calculating attendance percentage', error: error.message });
  }
};

/**
 * PUT /api/attendance/:id
 * Update an existing attendance record.
 */
export const updateAttendanceRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateAttendanceSchema.parse(req.body);
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await db.attendance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const isAuthorized = await verifyTeacherOrAdminAccess(requesterId, requesterRole, existing.studentId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: Unauthorized attendance modification' });
    }

    let updatedDate = existing.date;
    if (validatedData.date) {
      const { dayStart } = normalizeDateRange(validatedData.date);
      updatedDate = dayStart;
    }

    const updated = await db.attendance.update({
      where: { id },
      data: {
        status: validatedData.status || existing.status,
        date: updatedDate
      }
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error updating attendance record', error: error.message });
  }
};

/**
 * DELETE /api/attendance/:id
 * Delete an attendance record.
 */
export const deleteAttendanceRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await db.attendance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const isAuthorized = await verifyTeacherOrAdminAccess(requesterId, requesterRole, existing.studentId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: Unauthorized attendance deletion' });
    }

    await db.attendance.delete({ where: { id } });

    res.json({ message: 'Attendance record deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting attendance record', error: error.message });
  }
};

/**
 * GET /api/attendance/by-date?date=YYYY-MM-DD
 * Retrieve attendance records for the requester's authorized students for a specific date.
 */
export const getAttendanceByDate = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();
    const dateQuery = req.query.date as string;

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    if (requesterRole.includes('STUDENT')) {
      return res.status(403).json({ message: 'Forbidden: Students cannot access attendance by date' });
    }

    const { dayStart, dayEnd } = normalizeDateRange(dateQuery);

    let whereClause: any = {
      date: {
        gte: dayStart,
        lte: dayEnd
      }
    };

    if (requesterRole === 'TEACHER') {
      const enrollments = await db.courseEnrollment.findMany({
        where: {
          course: { teacherId: requesterId }
        },
        select: { studentId: true }
      });
      const studentIds = new Set(enrollments.map(e => e.studentId));

      const teacher = await db.user.findUnique({
        where: { id: requesterId },
        select: { centerGroupId: true }
      });
      if (teacher?.centerGroupId) {
        const groupStudents = await db.user.findMany({
          where: { centerGroupId: teacher.centerGroupId },
          select: { id: true }
        });
        groupStudents.forEach(s => studentIds.add(s.id));
      }

      whereClause.studentId = { in: Array.from(studentIds) };
    }

    const records = await db.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            gradeLevel: true,
            educationLevel: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      date: dayStart.toISOString().split('T')[0],
      dayStart,
      dayEnd,
      count: records.length,
      data: records
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching attendance by date', error: error.message });
  }
};

/**
 * POST /api/attendance/bulk
 * Bulk mark/upsert attendance for multiple students in a class or course session.
 */
export const bulkMarkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = bulkMarkAttendanceSchema.parse(req.body);
    const requesterId = req.user?.userId;
    const requesterRole = (req.user?.role || '').toUpperCase();

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const { dayStart, dayEnd } = normalizeDateRange(validatedData.date);
    const results: any[] = [];
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    for (const item of validatedData.records) {
      const isAuthorized = await verifyTeacherOrAdminAccess(requesterId, requesterRole, item.studentId);
      if (!isAuthorized) continue;

      if (item.status === 'PRESENT') presentCount++;
      else if (item.status === 'LATE') lateCount++;
      else if (item.status === 'ABSENT') absentCount++;

      const existing = await db.attendance.findFirst({
        where: {
          studentId: item.studentId,
          date: { gte: dayStart, lte: dayEnd }
        }
      });

      let record;
      if (existing) {
        record = await db.attendance.update({
          where: { id: existing.id },
          data: { status: item.status, date: dayStart }
        });

        // Notify student only if status actually changed
        if (existing.status !== item.status) {
          const statusArabic = statusMapArabic[item.status] || item.status;
          try {
            await db.notification.create({
              data: {
                userId: item.studentId,
                title: 'تحديث الحضور',
                message: `تم تحديث حالتك إلى "${statusArabic}" في الحصة بتاريخ ${dayStart.toLocaleDateString('ar-EG')}`,
                type: 'info'
              }
            });
          } catch {}
        }
      } else {
        record = await db.attendance.create({
          data: { studentId: item.studentId, date: dayStart, status: item.status }
        });

        // Notify student on new attendance creation
        const statusArabic = statusMapArabic[item.status] || item.status;
        try {
          await db.notification.create({
            data: {
              userId: item.studentId,
              title: 'تسجيل الحضور',
              message: `تم تسجيلك كـ "${statusArabic}" في الحصة بتاريخ ${dayStart.toLocaleDateString('ar-EG')}`,
              type: 'info'
            }
          });
        } catch {}
      }
      results.push(record);
    }

    if (results.length === 0 && validatedData.records.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'لم يتم حفظ أي سجلات: لا يوجد طلاب مصرح لك بتسجيل حضورهم في القائمة المرسلة.',
        count: 0
      });
    }

    res.json({
      success: true,
      count: results.length,
      summary: {
        total: results.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount
      },
      data: results
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error bulk marking attendance', error: error.message });
  }
};
