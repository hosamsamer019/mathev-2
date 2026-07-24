"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamRepository = void 0;
const database_1 = require("@smartmath/database");
class ExamRepository {
    static async getExamsByCourse(courseId) {
        return database_1.db.exam.findMany({
            where: { courseId },
            include: {
                questions: {
                    select: { id: true, questionText: true, options: true }
                }
            }
        });
    }
    static async getExamById(id) {
        return database_1.db.exam.findUnique({
            where: { id },
            include: {
                questions: true,
            }
        });
    }
    static async createExam(data) {
        return database_1.db.exam.create({ data });
    }
    static async createQuestion(data) {
        return database_1.db.examQuestion.create({ data });
    }
    static async getAttempt(userId, examId) {
        return database_1.db.examAttempt.findUnique({
            where: { userId_examId: { userId, examId } },
            include: {
                drafts: true,
                violations: true
            }
        });
    }
    static async startAttempt(data) {
        return database_1.db.examAttempt.create({ data });
    }
    static async updateAttempt(id, data) {
        return database_1.db.examAttempt.update({
            where: { id },
            data
        });
    }
    static async upsertDraftAnswer(attemptId, questionId, selectedOption) {
        return database_1.db.examDraftAnswer.upsert({
            where: { attemptId_questionId: { attemptId, questionId } },
            update: { selectedOption },
            create: { attemptId, questionId, selectedOption }
        });
    }
    static async logViolation(attemptId, type) {
        return database_1.db.examViolationLog.create({
            data: { attemptId, type }
        });
    }
}
exports.ExamRepository = ExamRepository;
//# sourceMappingURL=exam.repository.js.map