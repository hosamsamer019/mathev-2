import { CourseRepository } from '../repositories/course.repository.js';

export class CourseService {
  static async getCourses() {
    return CourseRepository.getAll();
  }

  static async getCourseDetails(id: string) {
    const course = await CourseRepository.getById(id);
    if (!course) {
      throw new Error('Course not found');
    }
    return course;
  }

  static async createCourse(data: { title: string; description?: string; price: number; isPremium: boolean; tenantId?: string }) {
    return CourseRepository.create(data);
  }

  static async updateCourse(id: string, data: Partial<{ title: string; description?: string; price: number; isPremium: boolean }>) {
    return CourseRepository.update(id, data);
  }

  static async deleteCourse(id: string) {
    return CourseRepository.delete(id);
  }

  static async addModule(data: { title: string; courseId: string }) {
    return CourseRepository.createModule(data);
  }

  static async addLesson(data: { title: string; videoUrl?: string; fileUrl?: string; duration: number; moduleId: string }) {
    return CourseRepository.createLesson(data);
  }

  static async updateLessonProgress(userId: string, lessonId: string, completed: boolean) {
    return CourseRepository.saveLessonProgress(userId, lessonId, completed);
  }
}
