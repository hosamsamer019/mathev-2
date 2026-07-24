"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseRepository = void 0;
const database_1 = require("@smartmath/database");
class CourseRepository {
    static async getAll() {
        return database_1.db.course.findMany({
            include: {
                modules: {
                    include: {
                        lessons: true
                    }
                }
            }
        });
    }
    static async getById(id) {
        return database_1.db.course.findUnique({
            where: { id },
            include: {
                modules: {
                    include: {
                        lessons: true
                    }
                }
            }
        });
    }
    static async create(data) {
        return database_1.db.course.create({
            data
        });
    }
    static async update(id, data) {
        return database_1.db.course.update({
            where: { id },
            data
        });
    }
    static async delete(id) {
        return database_1.db.course.delete({
            where: { id }
        });
    }
    static async createModule(data) {
        return database_1.db.module.create({
            data
        });
    }
    static async createLesson(data) {
        return database_1.db.lesson.create({
            data
        });
    }
    static async getLessonProgress(userId, lessonId) {
        return database_1.db.userLessonProgress.findUnique({
            where: {
                userId_lessonId: { userId, lessonId }
            }
        });
    }
    static async saveLessonProgress(userId, lessonId, completed) {
        return database_1.db.userLessonProgress.upsert({
            where: {
                userId_lessonId: { userId, lessonId }
            },
            update: {
                completed
            },
            create: {
                userId,
                lessonId,
                completed
            }
        });
    }
}
exports.CourseRepository = CourseRepository;
//# sourceMappingURL=course.repository.js.map