"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentSubmission = exports.submitHomework = exports.addQuestion = exports.createHomework = exports.getHomeworkDetails = exports.getHomeworksByCourse = exports.getAllHomeworks = void 0;
const zod_1 = require("zod");
const homework_service_js_1 = require("../services/homework.service.js");
const homeworkCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    courseId: zod_1.z.string(),
    deadline: zod_1.z.coerce.date(),
    status: zod_1.z.string().default('active')
});
const questionCreateSchema = zod_1.z.object({
    homeworkId: zod_1.z.string(),
    questionText: zod_1.z.string().min(3),
    options: zod_1.z.array(zod_1.z.string()).min(2),
    correctOption: zod_1.z.number().int().nonnegative()
});
const submitHomeworkSchema = zod_1.z.object({
    answers: zod_1.z.array(zod_1.z.object({
        questionId: zod_1.z.string(),
        selectedOption: zod_1.z.number().int().nonnegative()
    })).min(1)
});
const getAllHomeworks = async (req, res) => {
    try {
        const homeworks = await homework_service_js_1.HomeworkService.getAllHomeworks();
        res.json(homeworks);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching all homeworks', error: error.message });
    }
};
exports.getAllHomeworks = getAllHomeworks;
const getHomeworksByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const homeworks = await homework_service_js_1.HomeworkService.getHomeworksByCourse(courseId);
        res.json(homeworks);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching homeworks', error: error.message });
    }
};
exports.getHomeworksByCourse = getHomeworksByCourse;
const getHomeworkDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const homework = await homework_service_js_1.HomeworkService.getHomeworkDetails(id);
        res.json(homework);
    }
    catch (error) {
        if (error.message === 'Homework not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching homework details', error: error.message });
    }
};
exports.getHomeworkDetails = getHomeworkDetails;
const createHomework = async (req, res) => {
    try {
        const data = homeworkCreateSchema.parse(req.body);
        const homework = await homework_service_js_1.HomeworkService.createHomework(data);
        res.status(201).json(homework);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error creating homework', error: error.message });
    }
};
exports.createHomework = createHomework;
const addQuestion = async (req, res) => {
    try {
        const data = questionCreateSchema.parse(req.body);
        const question = await homework_service_js_1.HomeworkService.addQuestion(data);
        res.status(201).json(question);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error adding question', error: error.message });
    }
};
exports.addQuestion = addQuestion;
const submitHomework = async (req, res) => {
    try {
        const { id: homeworkId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'User unauthorized' });
        }
        const { answers } = submitHomeworkSchema.parse(req.body);
        const submission = await homework_service_js_1.HomeworkService.submitHomework(userId, homeworkId, answers);
        res.status(201).json(submission);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'Error submitting homework', error: error.message });
    }
};
exports.submitHomework = submitHomework;
const getStudentSubmission = async (req, res) => {
    try {
        const { id: homeworkId } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'User unauthorized' });
        }
        const submission = await homework_service_js_1.HomeworkService.getStudentSubmission(userId, homeworkId);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        res.json(submission);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching submission', error: error.message });
    }
};
exports.getStudentSubmission = getStudentSubmission;
//# sourceMappingURL=homework.controller.js.map