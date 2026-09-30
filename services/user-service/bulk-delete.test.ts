import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || '4685c8216cff4502cea1cf993d197d0dcbe6704215d2e2d29055b1e8fec1e02b';

function generateAdminToken(adminId: string) {
  return jwt.sign({ userId: adminId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
}

async function runBulkDeleteRegressionTests() {
  console.log('====================================================');
  console.log('  RUNNING BULK DELETE REGRESSION TEST SUITE');
  console.log('====================================================\n');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    throw new Error('No ADMIN user found in database to run tests.');
  }
  const token = generateAdminToken(admin.id);

  const localApi = axios.create({
    baseURL: 'http://localhost:4002/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const nginxApi = axios.create({
    baseURL: 'http://localhost:80/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  let passCount = 0;
  let failCount = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passCount++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.response?.data || err.message);
      failCount++;
    }
  }

  // --- TEST 1: Teacher with Courses and Assessments ---
  await assertTest('Bulk delete teacher with courses and assessments (foreign key test)', async () => {
    const teacher = await prisma.user.create({
      data: {
        name: 'Test Teacher For Bulk Delete',
        email: `teacher_reg_${Date.now()}@example.com`,
        password: 'password123',
        role: 'TEACHER'
      }
    });

    const course = await prisma.course.create({
      data: {
        title: 'Teacher Test Course',
        teacherId: teacher.id
      }
    });

    const assessment = await prisma.assessment.create({
      data: {
        title: 'Teacher Test Assessment',
        type: 'EXAM',
        courseId: course.id,
        teacherId: teacher.id
      }
    });

    // Execute bulk delete on teacher
    const res = await localApi.post('/users/users/bulk-delete', { userIds: [teacher.id] });
    if (res.status !== 200 || res.data.count !== 1) {
      throw new Error(`Expected count: 1 and status 200, got: ${res.status} ${JSON.stringify(res.data)}`);
    }

    // Verify DB
    const checkUser = await prisma.user.findUnique({ where: { id: teacher.id } });
    const checkCourse = await prisma.course.findUnique({ where: { id: course.id } });
    const checkAssessment = await prisma.assessment.findUnique({ where: { id: assessment.id } });

    if (checkUser || checkCourse || checkAssessment) {
      throw new Error('Teacher, Course, or Assessment was not fully deleted from DB');
    }
  });

  // --- TEST 2: Student with Attendance, VideoProgress, and Enrollments ---
  await assertTest('Bulk delete student with attendance, enrollment, and progress records', async () => {
    const teacher = await prisma.user.create({
      data: {
        name: 'Test Teacher 2',
        email: `teacher_t2_${Date.now()}@example.com`,
        password: 'password123',
        role: 'TEACHER'
      }
    });

    const course = await prisma.course.create({
      data: {
        title: 'Course 2',
        teacherId: teacher.id
      }
    });

    const lesson = await prisma.lesson.create({
      data: {
        title: 'Lesson 2',
        courseId: course.id
      }
    });

    const student = await prisma.user.create({
      data: {
        name: 'Test Student For Bulk Delete',
        email: `student_reg_${Date.now()}@example.com`,
        password: 'password123',
        role: 'ONLINE_STUDENT'
      }
    });

    await prisma.courseEnrollment.create({
      data: { studentId: student.id, courseId: course.id }
    });

    await prisma.attendance.create({
      data: { studentId: student.id, date: new Date(), status: 'PRESENT' }
    });

    await prisma.videoProgress.create({
      data: { studentId: student.id, lessonId: lesson.id, watched: true }
    });

    const res = await localApi.post('/users/users/bulk-delete', { userIds: [student.id] });
    if (res.status !== 200 || res.data.count !== 1) {
      throw new Error(`Expected count: 1 and status 200, got: ${res.status} ${JSON.stringify(res.data)}`);
    }

    const checkStudent = await prisma.user.findUnique({ where: { id: student.id } });
    if (checkStudent) throw new Error('Student was not deleted from DB');

    // Cleanup teacher & course
    await prisma.lesson.deleteMany({ where: { courseId: course.id } });
    await prisma.course.deleteMany({ where: { id: course.id } });
    await prisma.user.deleteMany({ where: { id: teacher.id } });
  });

  // --- TEST 3: Parent with children unlinking ---
  await assertTest('Bulk delete parent unlinks children parentId to null', async () => {
    const parent = await prisma.user.create({
      data: {
        name: 'Parent For Bulk Delete',
        email: `parent_reg_${Date.now()}@example.com`,
        password: 'password123',
        role: 'PARENT'
      }
    });

    const child = await prisma.user.create({
      data: {
        name: 'Child Student',
        email: `child_reg_${Date.now()}@example.com`,
        password: 'password123',
        role: 'ONLINE_STUDENT',
        parentId: parent.id
      }
    });

    const res = await localApi.post('/users/users/bulk-delete', { userIds: [parent.id] });
    if (res.status !== 200 || res.data.count !== 1) {
      throw new Error(`Expected count: 1, got: ${res.status} ${JSON.stringify(res.data)}`);
    }

    const checkChild = await prisma.user.findUnique({ where: { id: child.id } });
    if (!checkChild || checkChild.parentId !== null) {
      throw new Error(`Expected child parentId to be null, got: ${checkChild?.parentId}`);
    }

    await prisma.user.delete({ where: { id: child.id } });
  });

  // --- TEST 4: Self-delete prevention ---
  await assertTest('Self-deletion of requesting admin is prevented', async () => {
    const res = await localApi.post('/users/users/bulk-delete', { userIds: [admin.id] }).catch(e => e.response);
    if (res.status !== 400 && !res.data?.message?.includes('No users to delete')) {
      throw new Error(`Expected self-delete to be ignored/blocked with 400, got status: ${res.status}`);
    }
  });

  // --- TEST 5: Nginx Reverse Proxy Route ---
  await assertTest('Bulk delete works seamlessly through Nginx port 80 gateway', async () => {
    const tempUser = await prisma.user.create({
      data: {
        name: 'Nginx Route Test User',
        email: `nginx_test_${Date.now()}@example.com`,
        password: 'password123',
        role: 'ONLINE_STUDENT'
      }
    });

    const res = await nginxApi.post('/users/users/bulk-delete', { userIds: [tempUser.id] });
    if (res.status !== 200 || res.data.count !== 1) {
      throw new Error(`Expected count: 1 via Nginx, got: ${res.status} ${JSON.stringify(res.data)}`);
    }

    const checkUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
    if (checkUser) throw new Error('User was not deleted via Nginx route');
  });

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  await prisma.$disconnect();
  if (failCount > 0) process.exit(1);
}

runBulkDeleteRegressionTests().catch((err) => {
  console.error('Test Runner Failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
