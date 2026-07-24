"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeworkService = void 0;
const homework_repository_js_1 = require("../repositories/homework.repository.js");
class HomeworkService {
    static async getHomeworksByCourse(courseId) {
        const homeworks = await homework_repository_js_1.HomeworkRepository.getHomeworksByCourse(courseId);
        return homeworks.map(hw => ({
            ...hw,
            questions: hw.questions.map(({ correctOption, ...q }) => q)
        }));
    }
    static async getAllHomeworks() {
        return homework_repository_js_1.HomeworkRepository.getAllHomeworks();
    }
    static async getHomeworkDetails(id) {
        const homework = await homework_repository_js_1.HomeworkRepository.getHomeworkById(id);
        if (!homework)
            throw new Error('Homework not found');
        return {
            ...homework,
            questions: homework.questions.map(({ correctOption, ...q }) => q)
        };
    }
    static async createHomework(data) {
        return homework_repository_js_1.HomeworkRepository.createHomework(data);
    }
    static async addQuestion(data) {
        return homework_repository_js_1.HomeworkRepository.createQuestion(data);
    }
    static async getStudentSubmission(userId, homeworkId) {
        return homework_repository_js_1.HomeworkRepository.getSubmission(userId, homeworkId);
    }
    static async submitHomework(userId, homeworkId, answers) {
        const homework = await homework_repository_js_1.HomeworkRepository.getHomeworkById(homeworkId);
        if (!homework)
            throw new Error('Homework not found');
        // Calculate score
        let correctAnswers = 0;
        const totalQuestions = homework.questions.length;
        if (totalQuestions === 0)
            throw new Error('Homework has no questions');
        for (const answer of answers) {
            const question = homework.questions.find(q => q.id === answer.questionId);
            if (question && question.correctOption === answer.selectedOption) {
                correctAnswers++;
            }
        }
        const score = (correctAnswers / totalQuestions) * 100;
        // Create submission
        const submission = await homework_repository_js_1.HomeworkRepository.createSubmission({
            userId,
            homeworkId,
            score,
            status: 'completed',
            submittedAt: new Date()
        });
        // Create answers
        for (const answer of answers) {
            await homework_repository_js_1.HomeworkRepository.createAnswer({
                submissionId: submission.id,
                questionId: answer.questionId,
                selectedOption: answer.selectedOption
            });
        }
        return submission;
    }
}
exports.HomeworkService = HomeworkService;
//# sourceMappingURL=homework.service.js.map