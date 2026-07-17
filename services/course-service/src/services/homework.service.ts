import { HomeworkRepository } from '../repositories/homework.repository.js';

export class HomeworkService {
  static async getHomeworksByCourse(courseId: string) {
    const homeworks = await HomeworkRepository.getHomeworksByCourse(courseId);
    return homeworks.map(hw => ({
      ...hw,
      questions: hw.questions.map(({ correctOption, ...q }) => q)
    }));
  }

  static async getAllHomeworks() {
    return HomeworkRepository.getAllHomeworks();
  }

  static async getHomeworkDetails(id: string) {
    const homework = await HomeworkRepository.getHomeworkById(id);
    if (!homework) throw new Error('Homework not found');
    return {
      ...homework,
      questions: homework.questions.map(({ correctOption, ...q }) => q)
    };
  }

  static async createHomework(data: { title: string; courseId: string; deadline: Date; status: string }) {
    return HomeworkRepository.createHomework(data);
  }

  static async addQuestion(data: { homeworkId: string; questionText: string; options: string[]; correctOption: number }) {
    return HomeworkRepository.createQuestion(data);
  }

  static async getStudentSubmission(userId: string, homeworkId: string) {
    return HomeworkRepository.getSubmission(userId, homeworkId);
  }

  static async submitHomework(userId: string, homeworkId: string, answers: { questionId: string; selectedOption: number }[]) {
    const homework = await HomeworkRepository.getHomeworkById(homeworkId);
    if (!homework) throw new Error('Homework not found');

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = homework.questions.length;

    if (totalQuestions === 0) throw new Error('Homework has no questions');

    for (const answer of answers) {
      const question = homework.questions.find(q => q.id === answer.questionId);
      if (question && question.correctOption === answer.selectedOption) {
        correctAnswers++;
      }
    }

    const score = (correctAnswers / totalQuestions) * 100;

    // Create submission
    const submission = await HomeworkRepository.createSubmission({
      userId,
      homeworkId,
      score,
      status: 'completed',
      submittedAt: new Date()
    });

    // Create answers
    for (const answer of answers) {
      await HomeworkRepository.createAnswer({
        submissionId: submission.id,
        questionId: answer.questionId,
        selectedOption: answer.selectedOption
      });
    }

    return submission;
  }
}
