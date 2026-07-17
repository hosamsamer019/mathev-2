import { AnalyticsRepository } from '../repositories/analytics.repository.js';

export class AnalyticsService {
  static async getOverview(userId: string) {
    const examStats = await AnalyticsRepository.getExamStats(userId);
    const hwStats = await AnalyticsRepository.getHomeworkStats(userId);

    const totalWeight = examStats.completedCount + hwStats.completedCount;
    let overallRate = 0;
    if (totalWeight > 0) {
      overallRate = ((examStats.averageScore * examStats.completedCount) + (hwStats.averageScore * hwStats.completedCount)) / totalWeight;
    }

    // Mock ranking logic based on overall rate for Phase 6.
    // In production, this would query the DB for the percentile.
    let rank = 0;
    if (overallRate >= 95) rank = 1;
    else if (overallRate >= 90) rank = 3;
    else if (overallRate >= 80) rank = 15;
    else rank = 50;

    return {
      overallRate: Math.round(overallRate),
      examsCompleted: examStats.completedCount,
      homeworksCompleted: hwStats.completedCount,
      rank
    };
  }

  static async getCharts(userId: string) {
    const exams = await AnalyticsRepository.getRecentExams(userId, 10);
    const homeworks = await AnalyticsRepository.getRecentHomeworks(userId, 10);

    return {
      examResults: exams.map((e, idx) => ({
        name: e.exam.title.length > 15 ? e.exam.title.substring(0, 15) + '...' : e.exam.title,
        score: e.score,
        date: e.submittedAt?.toISOString()
      })),
      homeworkResults: homeworks.map((h, idx) => ({
        name: h.homework.title.length > 15 ? h.homework.title.substring(0, 15) + '...' : h.homework.title,
        score: h.score,
        date: h.submittedAt?.toISOString()
      }))
    };
  }

  static async getRecentActivities(userId: string, limit: number = 10) {
    const exams = await AnalyticsRepository.getRecentExams(userId, limit);
    const homeworks = await AnalyticsRepository.getRecentHomeworks(userId, limit);

    const merged = [
      ...exams.map(e => ({
        title: e.exam.title,
        type: 'امتحان',
        score: e.score,
        date: e.submittedAt?.toISOString().split('T')[0] || ''
      })),
      ...homeworks.map(h => ({
        title: h.homework.title,
        type: 'واجب',
        score: h.score,
        date: h.submittedAt?.toISOString().split('T')[0] || ''
      }))
    ];

    // Sort descending by date
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return merged.slice(0, limit);
  }

  static async getTeacherOverview(teacherId: string) {
    const stats = await AnalyticsRepository.getTeacherStats(teacherId);
    
    // Average score calculation
    const avgScore = (stats.averageExamScore + stats.averageHomeworkScore) / 2;

    // Completion rate is just a mocked percentage based on active submissions for MVP
    const completionRate = Math.min(100, Math.round((stats.completionRate / (stats.totalStudents || 1)) * 100));

    return {
      totalStudents: stats.totalStudents,
      totalCourses: stats.totalCourses,
      averageScore: Math.round(avgScore),
      completionRate: completionRate,
      strugglingStudents: stats.strugglingStudents,
      recentActivity: [
        // Generate some representative real-time alerts
        { type: 'low_engagement', count: stats.strugglingStudents, message: `${stats.strugglingStudents} طلاب يحتاجون إلى متابعة لتدني درجاتهم` },
      ]
    };
  }
}
