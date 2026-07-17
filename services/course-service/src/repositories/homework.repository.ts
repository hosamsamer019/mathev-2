import { db } from '@smartmath/database';

export class HomeworkRepository {
  static async getHomeworksByCourse(courseId: string) {
    return db.homework.findMany({
      where: { courseId },
      include: {
        questions: true,
      },
    });
  }

  static async getHomeworkById(id: string) {
    return db.homework.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });
  }

  static async createHomework(data: { title: string; courseId: string; deadline: Date; status: string }) {
    return db.homework.create({ data });
  }

  static async createQuestion(data: { homeworkId: string; questionText: string; options: string[]; correctOption: number }) {
    return db.homeworkQuestion.create({ data });
  }

  static async getSubmission(userId: string, homeworkId: string) {
    return db.studentHomeworkSubmission.findUnique({
      where: {
        userId_homeworkId: { userId, homeworkId },
      },
      include: {
        answers: true,
      },
    });
  }

  static async createSubmission(data: { userId: string; homeworkId: string; score: number; status: string; submittedAt: Date }) {
    return db.studentHomeworkSubmission.create({ data });
  }

  static async createAnswer(data: { submissionId: string; questionId: string; selectedOption: number }) {
    return db.studentHomeworkAnswer.create({ data });
  }

  static async getAllHomeworks() {
    return db.homework.findMany({
      include: {
        course: true,
        questions: true
      }
    });
  }
}
