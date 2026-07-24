"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAttempt = exports.logViolation = exports.syncDraft = exports.startAttempt = exports.getExamDetails = exports.getExamsByCourse = void 0;
const zod_1 = require("zod");
const exam_service_js_1 = require("../services/exam.service.js");
const answersArraySchema = zod_1.z.array(zod_1.z.object({
    questionId: zod_1.z.string(),
    selectedOption: zod_1.z.number().int().nonnegative()
}));
const submitExamSchema = zod_1.z.object({
    answers: answersArraySchema
});
const violationSchema = zod_1.z.object({
    type: zod_1.z.enum(['TAB_SWITCH', 'CAMERA_OFF'])
});
const getExamsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const exams = await exam_service_js_1.ExamService.getExamsByCourse(courseId);
        res.json(exams);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching exams', error: error.message });
    }
};
exports.getExamsByCourse = getExamsByCourse;
const getExamDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await exam_service_js_1.ExamService.getExamDetailsForStudent(id);
        res.json(exam);
    }
    catch (error) {
        if (error.message === 'Exam not found') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error fetching exam', error: error.message });
    }
};
exports.getExamDetails = getExamDetails;
const startAttempt = async (req, res) => {
    try {
        const { id: examId } = req.params;
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const attempt = await exam_service_js_1.ExamService.startAttempt(userId, examId);
        res.status(201).json(attempt);
    }
    catch (error) {
        res.status(400).json({ message: 'Error starting exam', error: error.message });
    }
};
exports.startAttempt = startAttempt;
const syncDraft = async (req, res) => {
    try {
        const { id: examId } = req.params;
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { answers } = submitExamSchema.parse(req.body);
        await exam_service_js_1.ExamService.syncDraft(userId, examId, answers);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ message: 'Error syncing draft', error: error.message });
    }
};
exports.syncDraft = syncDraft;
const logViolation = async (req, res) => {
    try {
        const { id: examId } = req.params;
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { type } = violationSchema.parse(req.body);
        await exam_service_js_1.ExamService.logViolation(userId, examId, type);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ message: 'Error logging violation', error: error.message });
    }
};
exports.logViolation = logViolation;
const submitAttempt = async (req, res) => {
    try {
        const { id: examId } = req.params;
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { answers } = submitExamSchema.parse(req.body);
        const result = await exam_service_js_1.ExamService.submitAttempt(userId, examId, answers);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: 'Error submitting exam', error: error.message });
    }
};
exports.submitAttempt = submitAttempt;
//# sourceMappingURL=exam.controller.js.map