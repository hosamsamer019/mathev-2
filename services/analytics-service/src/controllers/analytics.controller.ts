import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getAdminAnalytics = async (req: Request, res: Response) => {
  try {
    const totalUsers = await db.user.count();
    const totalCourses = await db.course.count();
    const totalExams = await db.exam.count();
    const totalSubmissions = await db.submission.count();

    const roleDistribution = await db.user.groupBy({
      by: ['role'],
      _count: true
    });

    res.json({
      overview: { totalUsers, totalCourses, totalExams, totalSubmissions },
      roleDistribution
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

export const getTeacherAnalytics = async (req: Request, res: Response) => {
  try {
    const { id: teacherId } = req.params;
    
    // For now return some mocked overall stats for the teacher dashboard
    const overview = {
      totalStudents: 150,
      totalCourses: 12,
      averageScore: 88,
      strugglingStudents: 5
    };
    
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching teacher analytics', error: error.message });
  }
};

export const getStudentOverview = async (req: AuthRequest, res: Response) => {
  res.json({
    gpa: 3.8,
    attendanceRate: 95,
    completedAssignments: 42,
    rank: 5
  });
};

export const getStudentCharts = async (req: AuthRequest, res: Response) => {
  res.json({
    performanceData: [
      { month: 'يناير', score: 85 },
      { month: 'فبراير', score: 88 },
      { month: 'مارس', score: 92 },
      { month: 'أبريل', score: 90 },
      { month: 'مايو', score: 95 }
    ],
    subjectProgress: [
      { subject: 'الجبر', progress: 85 },
      { subject: 'الهندسة', progress: 70 },
      { subject: 'التفاضل', progress: 90 },
      { subject: 'الإحصاء', progress: 65 }
    ]
  });
};

export const getStudentRecent = async (req: AuthRequest, res: Response) => {
  res.json([
    { id: 1, title: 'امتحان الجبر النصفي', type: 'exam', score: 95, date: '2026-05-15', status: 'excellent' },
    { id: 2, title: 'واجب الهندسة الفراغية', type: 'homework', score: 85, date: '2026-05-10', status: 'good' },
    { id: 3, title: 'اختبار قصير - التفاضل', type: 'quiz', score: 100, date: '2026-05-05', status: 'excellent' }
  ]);
};
