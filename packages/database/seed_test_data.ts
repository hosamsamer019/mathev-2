import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Password123!', 10);
  
  const student = await prisma.user.create({
    data: { email: 'student_test2@edu.com', password: hash, name: 'Test Student', role: 'ONLINE_STUDENT' }
  });

  const teacher = await prisma.user.create({
    data: { email: 'teacher_test2@edu.com', password: hash, name: 'Test Teacher', role: 'TEACHER' }
  });

  const course = await prisma.course.create({
    data: { title: 'Test Course', description: 'Test', price: 100, teacherId: teacher.id }
  });

  const lesson = await prisma.lesson.create({
    data: { title: 'Test Lesson', courseId: course.id, videoUrl: 'dQw4w9WgXcQ' }
  });

  const enrollment = await prisma.courseEnrollment.create({
    data: { studentId: student.id, courseId: course.id }
  });

  console.log(`Student created. Login with: student_test2@edu.com / Password123!`);
  console.log(`Course URL: http://localhost:5173/student-online/courses/${course.id}/lessons/${lesson.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
