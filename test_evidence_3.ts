import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING EVIDENCE 3 ---');

  // Create users
  const adminRes = await axios.post('http://localhost:4001/api/auth/register', { name: 'Admin2', email: `admin2_${Date.now()}@edu.com`, password: 'password123', role: 'ADMIN' });
  const adminConfig = { headers: { Authorization: `Bearer ${adminRes.data.token}` } };

  const studentRes = await axios.post('http://localhost:4001/api/auth/register', { name: 'Student2', email: `student2_${Date.now()}@edu.com`, password: 'password123', role: 'ONLINE_STUDENT' });
  const studentId = studentRes.data.user.id;
  const studentConfig = { headers: { Authorization: `Bearer ${studentRes.data.token}` } };
  
  const teacherRes = await axios.post('http://localhost:4001/api/auth/register', { name: 'Teacher2', email: `teacher2_${Date.now()}@edu.com`, password: 'password123', role: 'TEACHER' });
  const teacherConfig = { headers: { Authorization: `Bearer ${teacherRes.data.token}` } };

  // A3: Enroll and Course Details
  console.log('\n--- A3: Enroll and 200 Check ---');
  try {
    const courseRes = await axios.post('http://localhost:4004/api/courses', { title: 'A3 Course 2', description: 'Desc' }, adminConfig);
    const courseId = courseRes.data.id;
    
    await prisma.courseEnrollment.create({
      data: { studentId: studentId, courseId: courseId }
    });
    
    const studentCourses = await axios.get('http://localhost:4004/api/courses', studentConfig);
    console.log(`[A3] Student Enrolled Courses Count: ${studentCourses.data.length}`);
    
    const courseDetailsRes = await axios.get(`http://localhost:4004/api/courses/${courseId}`, studentConfig);
    console.log(`[A3] GET /api/courses/${courseId} (Enrolled) -> Status: ${courseDetailsRes.status}, Title: ${courseDetailsRes.data.title}`);
  } catch (err) {
    console.log(`[A3 ERROR] ${err.message}`);
  }

  // A5: Exam camera payload
  console.log('\n--- A5: Camera Checkbox Payload ---');
  try {
    // Let's create an exam as the teacher with requiresCamera: true
    const courseRes2 = await axios.post('http://localhost:4004/api/courses', { title: 'A5 Course', description: 'Desc' }, teacherConfig);
    const examRes = await axios.post('http://localhost:4004/api/exams', {
      title: 'Evidence Exam',
      duration: 30,
      courseId: courseRes2.data.id,
      requiresCamera: true,
      questions: []
    }, teacherConfig);
    
    console.log(`[A5] Exam requiresCamera flag saved as: ${examRes.data.requiresCamera}`);
  } catch(err) {
    console.log(`[A5 ERROR] ${err.message}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
