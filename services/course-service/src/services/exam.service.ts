import { ExamRepository } from '../repositories/exam.repository.js';

export class ExamService {
  static async getExamsByCourse(courseId: string) {
    const exams = await ExamRepository.getExamsByCourse(courseId);
    return exams.map(exam => ({
      ...exam,
      questions: exam.questions?.map(({ correctOption, ...q }: any) => q) || []
    }));
  }

  static async getExamDetailsForStudent(id: string) {
    const exam = await ExamRepository.getExamById(id);
    if (!exam) throw new Error('Exam not found');
    return {
      ...exam,
      questions: exam.questions.map(({ correctOption, ...q }) => q)
    };
  }

  static async startAttempt(userId: string, examId: string) {
    const existing = await ExamRepository.getAttempt(userId, examId);
    if (existing) {
      if (existing.status !== 'in-progress') {
        throw new Error('Exam already completed or disqualified');
      }
      return existing; // Resume attempt
    }
    return ExamRepository.startAttempt({ userId, examId });
  }

  static async syncDraft(userId: string, examId: string, answers: { questionId: string; selectedOption: number }[]) {
    const attempt = await ExamRepository.getAttempt(userId, examId);
    if (!attempt || attempt.status !== 'in-progress') throw new Error('No active attempt');

    for (const ans of answers) {
      await ExamRepository.upsertDraftAnswer(attempt.id, ans.questionId, ans.selectedOption);
    }
    return { success: true };
  }

  static async logViolation(userId: string, examId: string, type: string) {
    const attempt = await ExamRepository.getAttempt(userId, examId);
    if (!attempt || attempt.status !== 'in-progress') throw new Error('No active attempt');

    await ExamRepository.logViolation(attempt.id, type);

    // Check configurable tab-switch threshold from the exam settings
    if (type === 'TAB_SWITCH') {
      const exam = await ExamRepository.getExamById(examId);
      const maxSwitches = exam?.maxTabSwitches ?? 5;

      const updatedAttempt = await ExamRepository.getAttempt(userId, examId);
      const tabSwitches = updatedAttempt?.violations.filter(v => v.type === 'TAB_SWITCH').length || 0;
      if (tabSwitches >= maxSwitches) {
        await ExamRepository.updateAttempt(attempt.id, { status: 'disqualified', submittedAt: new Date(), score: 0 });
        throw new Error('Disqualified due to multiple tab switches');
      }
    }
    return { success: true };
  }

  static async submitAttempt(userId: string, examId: string, answers: { questionId: string; selectedOption: number }[]) {
    const attempt = await ExamRepository.getAttempt(userId, examId);
    if (!attempt) throw new Error('No active attempt');
    if (attempt.status !== 'in-progress') throw new Error('Attempt already finalized');

    const exam = await ExamRepository.getExamById(examId);
    if (!exam) throw new Error('Exam not found');

    const now = new Date();
    const durationMs = exam.duration * 60 * 1000;
    const gracePeriodMs = 60 * 1000; // 1 minute grace

    if (now.getTime() - attempt.startedAt.getTime() > durationMs + gracePeriodMs) {
      // Overtime
      await ExamRepository.updateAttempt(attempt.id, { status: 'auto-submitted', submittedAt: now });
      // Proceed to grade anyway, or cap score. Let's grade it but marked as auto-submitted.
    }

    // Grade logic
    let correctAnswers = 0;
    const totalQuestions = exam.questions.length;

    if (totalQuestions === 0) throw new Error('Exam has no questions');

    for (const ans of answers) {
      const q = exam.questions.find(x => x.id === ans.questionId);
      if (q && q.correctOption === ans.selectedOption) {
        correctAnswers++;
      }
    }

    const score = (correctAnswers / totalQuestions) * 100;
    
    // Save draft for final record
    for (const ans of answers) {
      await ExamRepository.upsertDraftAnswer(attempt.id, ans.questionId, ans.selectedOption);
    }

    return ExamRepository.updateAttempt(attempt.id, { 
      score, 
      status: attempt.status === 'in-progress' ? 'completed' : 'auto-submitted', 
      submittedAt: now 
    });
  }
}
