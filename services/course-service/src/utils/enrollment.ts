import { db } from '../../../../packages/database/src/index.js';

export const checkUserEnrollment = async (user: any, courseId: string) => {
  if (!user) return false;
  
  const role = (user.role || '').toUpperCase();
  const userId = user.userId || user.id;
  
  if (role === 'ADMIN') return true;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return false;

  if (role === 'TEACHER' && course.teacherId === userId) {
    return true;
  }

  // Check enrollment
  // const enrollment = await db.courseEnrollment.findFirst({
  //   where: { studentId: userId, courseId: courseId }
  // });
  // return !!enrollment;

  // TEMPORARY: Allow all students to have permissions to view videos
  return true;
};
