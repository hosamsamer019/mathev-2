"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeworkRepository = void 0;
const database_1 = require("@smartmath/database");
class HomeworkRepository {
    static async getHomeworksByCourse(courseId) {
        return database_1.db.homework.findMany({
            where: { courseId },
            include: {
                questions: true,
            },
        });
    }
    static async getHomeworkById(id) {
        return database_1.db.homework.findUnique({
            where: { id },
            include: {
                questions: true,
            },
        });
    }
    static async createHomework(data) {
        return database_1.db.homework.create({ data });
    }
    static async createQuestion(data) {
        return database_1.db.homeworkQuestion.create({ data });
    }
    static async getSubmission(userId, homeworkId) {
        return database_1.db.studentHomeworkSubmission.findUnique({
            where: {
                userId_homeworkId: { userId, homeworkId },
            },
            include: {
                answers: true,
            },
        });
    }
    static async createSubmission(data) {
        return database_1.db.studentHomeworkSubmission.create({ data });
    }
    static async createAnswer(data) {
        return database_1.db.studentHomeworkAnswer.create({ data });
    }
    static async getAllHomeworks() {
        return database_1.db.homework.findMany({
            include: {
                course: true,
                questions: true
            }
        });
    }
}
exports.HomeworkRepository = HomeworkRepository;
//# sourceMappingURL=homework.repository.js.map