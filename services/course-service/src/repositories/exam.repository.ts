import { db } from '@smartmath/database';

export class ExamRepository {
  static async getExamsByCourse(courseId: string) {
    return db.exam.findMany({
      where: { courseId },
      include: {
        questions: {
          select: { id: true, questionText: true, options: true }
        }
      }
    });
  }

  static async getExamById(id: string) {
    return db.exam.findUnique({
      where: { id },
      include: {
        questions: true,
      }
    });
  }

  static async createExam(data: { title: string; courseId: string; duration: number; status: string }) {
    return db.exam.create({ data });
  }

  static async createQuestion(data: { examId: string; questionText: string; options: string[]; correctOption: number }) {
    return db.examQuestion.create({ data });
  }

  static async getAttempt(userId: string, examId: string) {
    return db.examAttempt.findUnique({
      where: { userId_examId: { userId, examId } },
      include: {
        drafts: true,
        violations: true
      }
    });
  }

  static async startAttempt(data: { userId: string; examId: string }) {
    return db.examAttempt.create({ data });
  }

  static async updateAttempt(id: string, data: Partial<{ score: number; status: string; submittedAt: Date }>) {
    return db.examAttempt.update({
      where: { id },
      data
    });
  }

  static async upsertDraftAnswer(attemptId: string, questionId: string, selectedOption: number) {
    return db.examDraftAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { selectedOption },
      create: { attemptId, questionId, selectedOption }
    });
  }

  static async logViolation(attemptId: string, type: string) {
    return db.examViolationLog.create({
      data: { attemptId, type }
    });
  }
}
