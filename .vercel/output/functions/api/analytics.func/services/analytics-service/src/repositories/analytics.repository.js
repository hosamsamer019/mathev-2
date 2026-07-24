"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsRepository = void 0;
const database_1 = require("@smartmath/database");
class AnalyticsRepository {
    static async getExamStats(userId) {
        const agg = await database_1.db.examAttempt.aggregate({
            where: { userId, status: 'completed' },
            _avg: { score: true },
            _count: { _all: true }
        });
        return {
            averageScore: agg._avg.score || 0,
            completedCount: agg._count._all || 0
        };
    }
    static async getHomeworkStats(userId) {
        const agg = await database_1.db.studentHomeworkSubmission.aggregate({
            where: { userId: userId, status: 'completed' },
            _avg: { score: true },
            _count: { _all: true }
        });
        return {
            averageScore: agg._avg.score || 0,
            completedCount: agg._count._all || 0
        };
    }
    static async getRecentExams(userId, limit = 10) {
        return database_1.db.examAttempt.findMany({
            where: { userId, status: 'completed' },
            orderBy: { submittedAt: 'asc' },
            take: limit,
            include: { exam: { select: { title: true } } }
        });
    }
    static async getRecentHomeworks(userId, limit = 10) {
        return database_1.db.studentHomeworkSubmission.findMany({
            where: { userId: userId, status: 'completed' },
            orderBy: { submittedAt: 'asc' },
            take: limit,
            include: { homework: { select: { title: true } } }
        });
    }
    static async getTeacherStats(teacherId) {
        // Note: A real app would filter by courses taught by the teacher.
        // For this MVP slice, we aggregate globally or by courses associated if modeled.
        const totalStudents = await database_1.db.user.count({ where: { role: 'student_online' } });
        const totalCourses = await database_1.db.course.count();
        const exams = await database_1.db.examAttempt.aggregate({
            where: { status: 'completed' },
            _avg: { score: true }
        });
        const homeworks = await database_1.db.studentHomeworkSubmission.aggregate({
            where: { status: 'completed' },
            _avg: { score: true }
        });
        const submissionsCount = await database_1.db.studentHomeworkSubmission.count({ where: { status: 'completed' } });
        const examAttemptsCount = await database_1.db.examAttempt.count({ where: { status: 'completed' } });
        // Struggling students mock logic: count students with < 50 score
        const strugglingExams = await database_1.db.examAttempt.groupBy({
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
exports.AnalyticsRepository = AnalyticsRepository;
//# sourceMappingURL=analytics.repository.js.map