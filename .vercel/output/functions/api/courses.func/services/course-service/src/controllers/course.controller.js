"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProgress = exports.createLesson = exports.createModule = exports.createCourse = exports.getCourseDetails = exports.getCourses = void 0;
const zod_1 = require("zod");
const course_service_js_1 = require("../services/course.service.js");
const courseCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().nonnegative().default(0),
    isPremium: zod_1.z.boolean().default(false),
    tenantId: zod_1.z.string().optional()
});
const moduleCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    courseId: zod_1.z.string()
});
const lessonCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    videoUrl: zod_1.z.string().optional(),
    fileUrl: zod_1.z.string().optional(),
    duration: zod_1.z.number().int().nonnegative().default(0),
    moduleId: zod_1.z.string()
});
const progressUpdateSchema = zod_1.z.object({
    lessonId: zod_1.z.string(),
    completed: zod_1.z.boolean()
});
const getCourses = async (req, res) => {
    try {
        const courses = await course_service_js_1.CourseService.getCourses();
        res.json(courses);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
};
exports.getCourses = getCourses;
const getCourseDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await course_service_js_1.CourseService.getCourseDetails(id);
        res.json(course);
    }
    catch (error) {
        if (error.message === 'Course not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching course details', error: error.message });
    }
};
exports.getCourseDetails = getCourseDetails;
const createCourse = async (req, res) => {
    try {
        const data = courseCreateSchema.parse(req.body);
        const course = await course_service_js_1.CourseService.createCourse(data);
        res.status(201).json(course);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error creating course', error: error.message });
    }
};
exports.createCourse = createCourse;
const createModule = async (req, res) => {
    try {
        const data = moduleCreateSchema.parse(req.body);
        const module = await course_service_js_1.CourseService.addModule(data);
        res.status(201).json(module);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error creating module', error: error.message });
    }
};
exports.createModule = createModule;
const createLesson = async (req, res) => {
    try {
        const data = lessonCreateSchema.parse(req.body);
        const lesson = await course_service_js_1.CourseService.addLesson(data);
        res.status(201).json(lesson);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error creating lesson', error: error.message });
    }
};
exports.createLesson = createLesson;
const updateProgress = async (req, res) => {
    try {
        const { lessonId, completed } = progressUpdateSchema.parse(req.body);
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'User unauthorized' });
        }
        const progress = await course_service_js_1.CourseService.updateLessonProgress(userId, lessonId, completed);
        res.json(progress);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error updating progress', error: error.message });
    }
};
exports.updateProgress = updateProgress;
//# sourceMappingURL=course.controller.js.map