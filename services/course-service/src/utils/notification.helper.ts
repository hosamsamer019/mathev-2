import { db } from '../../../../packages/database/src/index.js';

/**
 * Notifies all students enrolled in a course, and their linked parents.
 */
export async function notifyCourseStudents(courseId: string, title: string, message: string, type: string = 'info') {
  try {
    const enrollments = await db.courseEnrollment.findMany({
      where: { courseId },
      include: { student: { select: { parentId: true } } }
    });

    const notifications = [];
    for (const e of enrollments) {
      // Notify Student
      notifications.push({
        userId: e.studentId,
        title,
        message,
        type
      });

      // Notify Parent if linked
      if (e.student.parentId) {
        notifications.push({
          userId: e.student.parentId,
          title: `إشعار لولي الأمر: ${title}`,
          message: `الطالب: ${message}`,
          type
        });
      }
    }

    if (notifications.length > 0) {
      await db.notification.createMany({ data: notifications });
    }
  } catch (error) {
    console.error('Failed to notify course students:', error);
  }
}

/**
 * Notifies the teacher of a course.
 */
export async function notifyTeacher(courseId: string, title: string, message: string, type: string = 'info') {
  try {
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true }
    });

    if (course?.teacherId) {
      await db.notification.create({
        data: {
          userId: course.teacherId,
          title,
          message,
          type
        }
      });
    }
  } catch (error) {
    console.error('Failed to notify teacher:', error);
  }
}
