"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseService = void 0;
const course_repository_js_1 = require("../repositories/course.repository.js");
class CourseService {
    static async getCourses() {
        return course_repository_js_1.CourseRepository.getAll();
    }
    static async getCourseDetails(id) {
        const course = await course_repository_js_1.CourseRepository.getById(id);
        if (!course) {
            throw new Error('Course not found');
        }
        return course;
    }
    static async createCourse(data) {
        return course_repository_js_1.CourseRepository.create(data);
    }
    static async updateCourse(id, data) {
        return course_repository_js_1.CourseRepository.update(id, data);
    }
    static async deleteCourse(id) {
        return course_repository_js_1.CourseRepository.delete(id);
    }
    static async addModule(data) {
        return course_repository_js_1.CourseRepository.createModule(data);
    }
    static async addLesson(data) {
        return course_repository_js_1.CourseRepository.createLesson(data);
    }
    static async updateLessonProgress(userId, lessonId, completed) {
        return course_repository_js_1.CourseRepository.saveLessonProgress(userId, lessonId, completed);
    }
}
exports.CourseService = CourseService;
//# sourceMappingURL=course.service.js.map