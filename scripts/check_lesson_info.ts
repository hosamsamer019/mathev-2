import { db } from '../packages/database/src/index.js';

async function checkData() {
  const lesson = await db.lesson.findFirst({
    where: { videoUrl: { contains: '1U-N5hmS0mmpRGVqjJjZJQiJ0-qxCO257' } },
    include: { course: true }
  });

  console.log('Found Lesson:', lesson ? {
    id: lesson.id,
    title: lesson.title,
    courseId: lesson.courseId,
    courseTitle: lesson.course.title,
    videoUrl: lesson.videoUrl
  } : 'NOT FOUND');

  const enrollments = await db.courseEnrollment.findMany({
    where: { courseId: lesson?.courseId },
    include: { student: true }
  });

  console.log('Enrollments:', enrollments.map(e => ({
    studentId: e.studentId,
    email: e.student.email,
    role: e.student.role
  })));

  const admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
  console.log('Admin:', admin ? { id: admin.id, email: admin.email } : 'NONE');

  await db.$disconnect();
}

checkData();
