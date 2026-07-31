import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const db = new PrismaClient();
const AUTH_API = 'http://localhost:4001/api/auth';
const USER_API = 'http://localhost:4002/api/users';
const COURSE_API = 'http://localhost:4003/api/courses';
const ANALYTICS_API = 'http://localhost:4005/api/analytics';

async function run() {
  try {
    console.log("==================================================");
    console.log("1. FIX 0 (Admin creates a Teacher)");
    console.log("==================================================");
    
    // 1. Admin login
    const adminRes = await axios.post(`${AUTH_API}/login`, {
      email: 'admin@edu.com',
      password: '123456',
      role: 'ADMIN'
    });
    const adminToken = adminRes.data.token;

    // 2. Admin creates a Teacher
    const teacherPayload = {
      name: 'New Teacher Fix0',
      email: `teacher_fix0_${Date.now()}@edu.com`,
      password: 'teacher_password',
      role: 'TEACHER'
    };
    
    console.log('\n--- Request Payload (Admin -> POST /users) ---');
    console.log(JSON.stringify(teacherPayload, null, 2));

    const createTeacherRes = await axios.post(`${USER_API}/users`, teacherPayload, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('\n--- Response (New User created) ---');
    console.log(JSON.stringify(createTeacherRes.data, null, 2));

    // 3. Teacher logs in
    const teacherLoginRes = await axios.post(`${AUTH_API}/login`, {
      email: teacherPayload.email,
      password: teacherPayload.password,
      role: 'TEACHER'
    });

    console.log('\n--- Login Response (New Teacher auth) ---');
    console.log(JSON.stringify({
      message: teacherLoginRes.data.message,
      user: teacherLoginRes.data.user,
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // truncated for display
    }, null, 2));


    console.log("\n==================================================");
    console.log("2. FIX 1 (Notifications) & 3. FIX 2 (Parent Dashboard)");
    console.log("==================================================");

    // Create Student & Parent
    const parentEmail = `parent_${Date.now()}@edu.com`;
    const studentEmail = `student_${Date.now()}@edu.com`;

    const createParentRes = await axios.post(`${USER_API}/users`, {
      name: 'Parent Fix1', email: parentEmail, password: 'password123', role: 'PARENT'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    const createStudentRes = await axios.post(`${USER_API}/users`, {
      name: 'Student Fix1', email: studentEmail, password: 'password123', role: 'ONLINE_STUDENT',
      parentId: createParentRes.data.user.id
    }, { headers: { Authorization: `Bearer ${adminToken}` } });

    const parentId = createParentRes.data.user.id;
    const studentId = createStudentRes.data.user.id;

    // Trigger Notification: Admin marks attendance
    const attendancePayload = {
      studentId: studentId,
      courseId: '00000000-0000-0000-0000-000000000000', // Dummy
      date: new Date().toISOString(),
      status: 'PRESENT'
    };
    await axios.post(`http://localhost:4002/api/attendance`, attendancePayload, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Fetch DB Row
    const dbNotification = await db.notification.findFirst({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' }
    });
    console.log('\n--- Actual DB Row in Notification Table ---');
    console.log(JSON.stringify(dbNotification, null, 2));

    // Fetch via GET /notifications as Student
    const studentLoginRes = await axios.post(`${AUTH_API}/login`, {
      email: studentEmail, password: 'password123', role: 'ONLINE_STUDENT'
    });
    const studentToken = studentLoginRes.data.token;
    
    const notificationsRes = await axios.get(`http://localhost:4002/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    console.log('\n--- GET /notifications Response (Student) ---');
    console.log(JSON.stringify(notificationsRes.data, null, 2));


    // Inject grades for Parent Dashboard so it's non-zero
    const course = await db.course.create({ data: { title: 'Test Course', teacherId: createTeacherRes.data.user.id } });
    const homework = await db.homework.create({ data: { title: 'Math Algebra HW', courseId: course.id } });
    const exam = await db.exam.create({ data: { title: 'Midterm Math Exam', courseId: course.id } });
    
    await db.submission.create({
      data: {
        homeworkId: homework.id,
        studentId: studentId,
        url: 'http://example.com',
        grade: 95
      }
    });

    await db.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: studentId,
        score: 88,
        answers: {}
      }
    });

    // Login as Parent to fetch dashboard
    const parentLoginRes = await axios.post(`${AUTH_API}/login`, {
      email: parentEmail, password: 'password123', role: 'PARENT'
    });
    const parentToken = parentLoginRes.data.token;

    const parentOverviewRes = await axios.get(`${ANALYTICS_API}/parent/child/${studentId}/overview`, {
      headers: { Authorization: `Bearer ${parentToken}` }
    });

    console.log('\n--- GET /parent/child/:id/overview Response (Parent) ---');
    console.log(JSON.stringify(parentOverviewRes.data, null, 2));

  } catch (error) {
    console.error('Test Failed:', error.response ? error.response.data : error.message);
  } finally {
    await db.$disconnect();
  }
}

run();
