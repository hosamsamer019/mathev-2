"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamService = void 0;
const exam_repository_js_1 = require("../repositories/exam.repository.js");
class ExamService {
    static async getExamsByCourse(courseId) {
        const exams = await exam_repository_js_1.ExamRepository.getExamsByCourse(courseId);
        return exams.map(exam => ({
            ...exam,
            questions: exam.questions?.map(({ correctOption, ...q }) => q) || []
        }));
    }
    static async getExamDetailsForStudent(id) {
        const exam = await exam_repository_js_1.ExamRepository.getExamById(id);
        if (!exam)
            throw new Error('Exam not found');
        return {
            ...exam,
            questions: exam.questions.map(({ correctOption, ...q }) => q)
        };
    }
    static async startAttempt(userId, examId) {
        const existing = await exam_repository_js_1.ExamRepository.getAttempt(userId, examId);
        if (existing) {
            if (existing.status !== 'in-progress') {
                throw new Error('Exam already completed or disqualified');
            }
            return existing; // Resume attempt
        }
        return exam_repository_js_1.ExamRepository.startAttempt({ userId, examId });
    }
    static async syncDraft(userId, examId, answers) {
        const attempt = await exam_repository_js_1.ExamRepository.getAttempt(userId, examId);
        if (!attempt || attempt.status !== 'in-progress')
            throw new Error('No active attempt');
        for (const ans of answers) {
            await exam_repository_js_1.ExamRepository.upsertDraftAnswer(attempt.id, ans.questionId, ans.selectedOption);
        }
        return { success: true };
    }
    static async logViolation(userId, examId, type) {
        const attempt = await exam_repository_js_1.ExamRepository.getAttempt(userId, examId);
        if (!attempt || attempt.status !== 'in-progress')
            throw new Error('No active attempt');
        await exam_repository_js_1.ExamRepository.logViolation(attempt.id, type);
        // Check configurable tab-switch threshold from the exam settings
        if (type === 'TAB_SWITCH') {
            const exam = await exam_repository_js_1.ExamRepository.getExamById(examId);
            const maxSwitches = exam?.maxTabSwitches ?? 5;
            const updatedAttempt = await exam_repository_js_1.ExamRepository.getAttempt(userId, examId);
            const tabSwitches = updatedAttempt?.violations.filter(v => v.type === 'TAB_SWITCH').length || 0;
            if (tabSwitches >= maxSwitches) {
                await exam_repository_js_1.ExamRepository.updateAttempt(attempt.id, { status: 'disqualified', submittedAt: new Date(), score: 0 });
                throw new Error('Disqualified due to multiple tab switches');
            }
        }
        return { success: true };
    }
    static async submitAttempt(userId, examId, answers) {
        const attempt = await exam_repository_js_1.ExamRepository.getAttempt(userId, examId);
        if (!attempt)
            throw new Error('No active attempt');
        if (attempt.status !== 'in-progress')
            throw new Error('Attempt already finalized');
        const exam = await exam_repository_js_1.ExamRepository.getExamById(examId);
        if (!exam)
            throw new Error('Exam not found');
        const now = new Date();
        const durationMs = exam.duration * 60 * 1000;
        const gracePeriodMs = 60 * 1000; // 1 minute grace
        if (now.getTime() - attempt.startedAt.getTime() > durationMs + gracePeriodMs) {
            // Overtime
            await exam_repository_js_1.ExamRepository.updateAttempt(attempt.id, { status: 'auto-submitted', submittedAt: now });
            // Proceed to grade anyway, or cap score. Let's grade it but marked as auto-submitted.
        }
        // Grade logic
        let correctAnswers = 0;
        const totalQuestions = exam.questions.length;
        if (totalQuestions === 0)
            throw new Error('Exam has no questions');
        for (const ans of answers) {
            const q = exam.questions.find(x => x.id === ans.questionId);
            if (q && q.correctOption === ans.selectedOption) {
                correctAnswers++;
            }
        }
        const score = (correctAnswers / totalQuestions) * 100;
        // Save draft for final record
        for (const ans of answers) {
            await exam_repository_js_1.ExamRepository.upsertDraftAnswer(attempt.id, ans.questionId, ans.selectedOption);
        }
        return exam_repository_js_1.ExamRepository.updateAttempt(attempt.id, {
            score,
            status: attempt.status === 'in-progress' ? 'completed' : 'auto-submitted',
            submittedAt: now
        });
    }
}
exports.ExamService = ExamService;
//# sourceMappingURL=exam.service.js.map