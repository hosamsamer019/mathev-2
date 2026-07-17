import { db } from '@smartmath/database';

export class CourseRepository {
  static async getAll() {
    return db.course.findMany({
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    });
  }

  static async getById(id: string) {
    return db.course.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    });
  }

  static async create(data: { title: string; description?: string; price: number; isPremium: boolean; tenantId?: string }) {
    return db.course.create({
      data
    });
  }

  static async update(id: string, data: Partial<{ title: string; description?: string; price: number; isPremium: boolean }>) {
    return db.course.update({
      where: { id },
      data
    });
  }

  static async delete(id: string) {
    return db.course.delete({
      where: { id }
    });
  }

  static async createModule(data: { title: string; courseId: string }) {
    return db.module.create({
      data
    });
  }

  static async createLesson(data: { title: string; videoUrl?: string; fileUrl?: string; duration: number; moduleId: string }) {
    return db.lesson.create({
      data
    });
  }

  static async getLessonProgress(userId: string, lessonId: string) {
    return db.userLessonProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId }
      }
    });
  }

  static async saveLessonProgress(userId: string, lessonId: string, completed: boolean) {
    return db.userLessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId }
      },
      update: {
        completed
      },
      create: {
        userId,
        lessonId,
        completed
      }
    });
  }
}
