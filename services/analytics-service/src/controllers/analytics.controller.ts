import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getAdminAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const totalUsers = await db.user.count();
    const totalCourses = await db.course.count();
    const totalExams = await db.exam.count();
    const totalSubmissions = await db.submission.count();

    const roleDistribution = await db.user.groupBy({
      by: ['role'],
      _count: true
    });
    
    // Generate some basic timeseries data (ideally grouped by createdAt in SQL)
    // For now, since SQLite/Prisma date grouping is complex, we will generate structural data based on actual counts
    const enrollmentData = [
      { month: 'الشهر الماضي', students: Math.max(0, totalUsers - 5) },
      { month: 'الشهر الحالي', students: totalUsers }
    ];

    const courses = await db.course.findMany({
      include: { exams: { include: { attempts: true } } },
      take: 5
    });

    const performanceData = courses.map(c => {
      let total = 0, count = 0;
      c.exams.forEach(e => e.attempts.forEach(a => { total += a.score; count++; }));
      return {
        course: c.title,
        average: count > 0 ? Math.round(total / count) : 0
      };
    });

    // Real revenue from Payment table (Stripe will update this when integrated)
    const payments = await db.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true, date: true }
    });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const revenueData = [
      { month: 'إجمالي الإيرادات', revenue: totalRevenue },
      { month: 'المدفوعات المكتملة', revenue: payments.length }
    ];

    const recentActivities = [
      { text: `إجمالي الطلاب المسجلين: ${totalUsers}`, time: 'محدث الآن', type: 'info' },
      { text: `إجمالي الدورات النشطة: ${totalCourses}`, time: 'محدث الآن', type: 'success' },
    ];

    res.json({
      overview: { totalUsers, totalCourses, totalExams, totalSubmissions },
      roleDistribution,
      enrollmentData,
      performanceData: performanceData.length > 0 ? performanceData : [{ course: 'لا يوجد', average: 0 }],
      revenueData,
      recentActivities
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

export const getParentAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?.userId;
    if (!parentId) return res.status(401).json({ message: 'Unauthorized' });

    const children = await db.user.findMany({
      where: { parentId },
      include: {
        examAttempts: { include: { exam: true } },
        submissions: { include: { homework: true } },
        attendances: true
      }
    });

    res.json({ children });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching parent analytics', error: error.message });
  }
};

export const getParentChildOverview = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?.userId;
    const childId = req.params.id;

    if (!parentId) return res.status(401).json({ message: 'Unauthorized' });

    const child = await db.user.findFirst({
      where: { id: childId, parentId },
      include: {
        examAttempts: { include: { exam: true } },
        submissions: { include: { homework: true } },
        attendances: true
      }
    });

    if (!child) return res.status(404).json({ message: 'Child not found' });

    const examsCompleted = child.examAttempts.length;
    const homeworksCompleted = child.submissions.length;
    let totalScore = 0;
    
    const recent = [];
    const examResults = [];
    const homeworkResults = [];

    for (const attempt of child.examAttempts) {
      totalScore += attempt.score;
      recent.push({ id: attempt.id, title: attempt.exam.title, type: 'exam', score: attempt.score, date: attempt.createdAt.toISOString().split('T')[0] });
      examResults.push({ name: attempt.exam.title, score: attempt.score });
    }

    for (const sub of child.submissions) {
      totalScore += sub.grade || 0;
      recent.push({ id: sub.id, title: sub.homework.title, type: 'homework', score: sub.grade || 0, date: sub.createdAt.toISOString().split('T')[0] });
      homeworkResults.push({ name: sub.homework.title, score: sub.grade || 0 });
    }

    recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const overallRate = (examsCompleted + homeworksCompleted) > 0 
      ? Math.round(totalScore / (examsCompleted + homeworksCompleted)) 
      : 0;

    res.json({
      overview: {
        overallRate,
        examsCompleted,
        homeworksCompleted,
        rank: 1 // Placeholder for now
      },
      recent,
      charts: {
        examResults,
        homeworkResults
      }
    });

  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching child overview', error: error.message });
  }
};

export const getTeacherAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { id: teacherId } = req.params;
    const requesterId = req.user?.userId;
    const role = (req.user?.role || '').toUpperCase();

    if (role !== 'ADMIN' && requesterId !== teacherId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const courses = await db.course.findMany({
      where: { teacherId },
      include: {
        enrollments: { select: { studentId: true } },
        exams: {
          include: {
            attempts: { select: { studentId: true, score: true } }
          }
        }
      }
    });

    const totalCourses = courses.length;
    const studentIds = new Set<string>();
    
    let totalScore = 0;
    let attemptCount = 0;
    const studentScores = new Map<string, { total: number, count: number }>();

    for (const course of courses) {
      for (const e of course.enrollments) {
        studentIds.add(e.studentId);
      }
      for (const exam of course.exams) {
        for (const attempt of exam.attempts) {
           totalScore += attempt.score;
           attemptCount++;
           const st = studentScores.get(attempt.studentId) || { total: 0, count: 0 };
           st.total += attempt.score;
           st.count++;
           studentScores.set(attempt.studentId, st);
        }
      }
    }

    const totalStudents = studentIds.size;
    const averageScore = attemptCount > 0 ? Math.round(totalScore / attemptCount) : 0;
    
    let strugglingStudents = 0;
    for (const stats of studentScores.values()) {
       if (stats.total / stats.count < 50) {
         strugglingStudents++;
       }
    }
    
    res.json({
      totalStudents,
      totalCourses,
      averageScore,
      strugglingStudents
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching teacher analytics', error: error.message });
  }
};

export const getStudentOverview = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    // Calculate real GPA based on average of Exam Attempts and Homework Submissions
    const exams = await db.examAttempt.findMany({ where: { studentId } });
    const homeworks = await db.submission.findMany({ where: { studentId } });

    let totalScore = 0;
    exams.forEach(e => totalScore += e.score);
    homeworks.forEach(h => totalScore += (h.grade || 0));
    
    const totalAssignments = exams.length + homeworks.length;
    const average100 = totalAssignments > 0 ? totalScore / totalAssignments : 0;
    const gpa = Number((average100 / 25).toFixed(1)); 

    // Attendance Rate
    const attendances = await db.attendance.findMany({ where: { studentId } });
    const presentCount = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendanceRate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;

    res.json({
      gpa,
      attendanceRate,
      completedAssignments: totalAssignments,
      rank: 1 // Rank is hard to calculate accurately across all students without heavy DB load, so default 1.
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching student overview', error: error.message });
  }
};

export const getStudentCharts = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const exams = await db.examAttempt.findMany({
      where: { studentId },
      include: { exam: { include: { course: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const performanceData: { month: string; score: number }[] = [];
    const subjectProgressMap = new Map<string, { total: number, count: number }>();

    // Using Arabic months as expected by frontend mock
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    exams.forEach(attempt => {
       const monthIdx = attempt.createdAt.getMonth();
       performanceData.push({ month: arabicMonths[monthIdx], score: attempt.score });

       const subject = attempt.exam.course.title;
       const prog = subjectProgressMap.get(subject) || { total: 0, count: 0 };
       prog.total += attempt.score;
       prog.count++;
       subjectProgressMap.set(subject, prog);
    });

    const subjectProgress: { subject: string; progress: number }[] = [];
    for (const [subject, stats] of subjectProgressMap.entries()) {
       subjectProgress.push({ subject, progress: Math.round(stats.total / stats.count) });
    }

    res.json({
      performanceData: performanceData.length > 0 ? performanceData : [{ month: 'لا توجد بيانات', score: 0 }],
      subjectProgress: subjectProgress.length > 0 ? subjectProgress : [{ subject: 'لا توجد بيانات', progress: 0 }]
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching student charts', error: error.message });
  }
};

export const getStudentRecent = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ message: 'Unauthorized' });

    const exams = await db.examAttempt.findMany({
      where: { studentId },
      include: { exam: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const homeworks = await db.submission.findMany({
      where: { studentId },
      include: { homework: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const combined = [];
    for (const e of exams) {
      combined.push({
        id: e.id,
        title: e.exam.title,
        type: 'exam',
        score: e.score,
        date: e.createdAt.toISOString().split('T')[0],
        status: e.score >= 85 ? 'excellent' : (e.score >= 65 ? 'good' : 'needs_improvement')
      });
    }

    for (const h of homeworks) {
      combined.push({
        id: h.id,
        title: h.homework.title,
        type: 'homework',
        score: h.grade || 0,
        date: h.createdAt.toISOString().split('T')[0],
        status: (h.grade || 0) >= 85 ? 'excellent' : ((h.grade || 0) >= 65 ? 'good' : 'needs_improvement')
      });
    }

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    res.json(combined.slice(0, 5));
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching recent items', error: error.message });
  }
};
