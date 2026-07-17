import { db } from '@smartmath/database';

export class AnalyticsRepository {
  static async getExamStats(userId: string) {
    const agg = await db.examAttempt.aggregate({
      where: { userId, status: 'completed' },
      _avg: { score: true },
      _count: { _all: true }
    });
    return {
      averageScore: agg._avg.score || 0,
      completedCount: agg._count._all || 0
    };
  }

  static async getHomeworkStats(userId: string) {
    const agg = await db.studentHomeworkSubmission.aggregate({
      where: { userId: userId, status: 'completed' },
      _avg: { score: true },
      _count: { _all: true }
    });
    return {
      averageScore: agg._avg.score || 0,
      completedCount: agg._count._all || 0
    };
  }

  static async getRecentExams(userId: string, limit: number = 10) {
    return db.examAttempt.findMany({
      where: { userId, status: 'completed' },
      orderBy: { submittedAt: 'asc' },
      take: limit,
      include: { exam: { select: { title: true } } }
    });
  }

  static async getRecentHomeworks(userId: string, limit: number = 10) {
    return db.studentHomeworkSubmission.findMany({
      where: { userId: userId, status: 'completed' },
      orderBy: { submittedAt: 'asc' },
      take: limit,
      include: { homework: { select: { title: true } } }
    });
  }

  static async getTeacherStats(teacherId: string) {
    // Note: A real app would filter by courses taught by the teacher.
    // For this MVP slice, we aggregate globally or by courses associated if modeled.
    const totalStudents = await db.user.count({ where: { role: 'student_online' } });
    const totalCourses = await db.course.count();

    const exams = await db.examAttempt.aggregate({
      where: { status: 'completed' },
      _avg: { score: true }
    });

    const homeworks = await db.studentHomeworkSubmission.aggregate({
      where: { status: 'completed' },
      _avg: { score: true }
    });

    const submissionsCount = await db.studentHomeworkSubmission.count({ where: { status: 'completed' } });
    const examAttemptsCount = await db.examAttempt.count({ where: { status: 'completed' } });

    // Struggling students mock logic: count students with < 50 score
    const strugglingExams = await db.examAttempt.groupBy({
      by: ['userId'],
      having: {
        score: { _avg: { lt: 50 } }
      }
    });

    return {
      totalStudents,
      totalCourses,
      averageExamScore: exams._avg.score || 0,
      averageHomeworkScore: homeworks._avg.score || 0,
      completionRate: submissionsCount + examAttemptsCount,
      strugglingStudents: strugglingExams.length
    };
  }
}
