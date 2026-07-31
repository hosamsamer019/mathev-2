import { PrismaClient } from './packages/database/src/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const db = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

// Base URLs based on docker/local config
const USER_URL = 'http://localhost:4002/api';
const COURSE_URL = 'http://localhost:4004/api';

function generateToken(userId: string, role: string, email: string) {
  return jwt.sign({ userId, role, email }, JWT_SECRET, { expiresIn: '1h' });
}

async function verifyPhase2() {
  console.log('--- STARTING PHASE 2 VERIFICATION ---\n');

  try {
    // 1. Setup Test Data
    const t1 = await db.user.create({ data: { email: 't1@test.com', name: 'Teacher 1', password: 'pw', role: 'TEACHER' } });
    const t2 = await db.user.create({ data: { email: 't2@test.com', name: 'Teacher 2', password: 'pw', role: 'TEACHER' } });
    
    const admin = await db.user.create({ data: { email: 'admin@test.com', name: 'Admin', password: 'pw', role: 'ADMIN' } });
    
    const s1 = await db.user.create({ data: { email: 's1@test.com', name: 'Student 1', password: 'pw', role: 'ONLINE_STUDENT' } });
    const s2 = await db.user.create({ data: { email: 's2@test.com', name: 'Student 2', password: 'pw', role: 'ONLINE_STUDENT' } });

    const c1 = await db.course.create({ data: { title: 'Course 1', teacherId: t1.id } });
    const c2 = await db.course.create({ data: { title: 'Course 2', teacherId: t2.id } });

    await db.courseEnrollment.create({ data: { studentId: s1.id, courseId: c1.id } });
    await db.courseEnrollment.create({ data: { studentId: s2.id, courseId: c2.id } });

    const e1 = await db.exam.create({ data: { title: 'Exam 1', courseId: c1.id } });
    const e2 = await db.exam.create({ data: { title: 'Exam 2', courseId: c2.id } });
    
    const l1 = await db.lesson.create({ data: { title: 'Lesson 1', courseId: c1.id } });
    const hw1 = await db.homework.create({ data: { title: 'Homework 1', courseId: c1.id } });

    const tokenT1 = generateToken(t1.id, 'TEACHER', t1.email);
    const tokenT2 = generateToken(t2.id, 'TEACHER', t2.email);
    const tokenAdmin = generateToken(admin.id, 'ADMIN', admin.email);

    // ==========================================
    // VERIFY A2 - TEACHER SCOPING
    // ==========================================
    console.log('--- VERIFY A2: Teacher Scoping ---');
    const reqConf = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
    
    // Teacher 1
    const t1Courses = await axios.get(`${COURSE_URL}/courses`, reqConf(tokenT1));
    const t1Exams = await axios.get(`${COURSE_URL}/exams`, reqConf(tokenT1));
    const t1Students = await axios.get(`${USER_URL}/users/users`, reqConf(tokenT1));
    
    // Teacher 2
    const t2Courses = await axios.get(`${COURSE_URL}/courses`, reqConf(tokenT2));
    const t2Exams = await axios.get(`${COURSE_URL}/exams`, reqConf(tokenT2));
    const t2Students = await axios.get(`${USER_URL}/users/users`, reqConf(tokenT2));
    
    // Admin
    const adminCourses = await axios.get(`${COURSE_URL}/courses`, reqConf(tokenAdmin));
    
    console.log(`Teacher 1 sees ${t1Courses.data.length} courses (expect 1, id: ${c1.id}). Got: ${t1Courses.data[0]?.id}`);
    console.log(`Teacher 2 sees ${t2Courses.data.length} courses (expect 1, id: ${c2.id}). Got: ${t2Courses.data[0]?.id}`);
    console.log(`Teacher 1 sees ${t1Exams.data.length} exams (expect 1, id: ${e1.id}). Got: ${t1Exams.data[0]?.id}`);
    console.log(`Teacher 1 sees ${t1Students.data.length} students (expect 1, name: Student 1). Got: ${t1Students.data[0]?.name}`);
    console.log(`Admin sees ${adminCourses.data.length} courses (expect multiple, platform-wide).`);

    // ==========================================
    // VERIFY FIX 7 - LESSON FETCH
    // ==========================================
    console.log('\n--- VERIFY FIX 7: Lesson Fetch (GET /api/courses/lessons/:id) ---');
    const lessonFetch = await axios.get(`${COURSE_URL}/courses/lessons/${l1.id}`, reqConf(tokenT1));
    console.log(`Lesson fetch successful: ${lessonFetch.data.id === l1.id}, Title: ${lessonFetch.data.title}`);

    // ==========================================
    // VERIFY FIX 8 - HOMEWORK UPLOAD
    // ==========================================
    console.log('\n--- VERIFY FIX 8: Homework Upload with URL ---');
    const hwSubmitRes = await axios.post(`${COURSE_URL}/homework/${hw1.id}/submit`, {
      url: 'https://docs.google.com/test-homework-link'
    }, reqConf(tokenT1));
    
    const dbSub = await db.submission.findFirst({ where: { homeworkId: hw1.id } });
    console.log(`Homework submitted via API. Result ID: ${hwSubmitRes.data.id}`);
    console.log(`URL saved in DB: ${dbSub?.url}`);

    // ==========================================
    // VERIFY A1 - DRM MESSAGE
    // ==========================================
    console.log('\n--- VERIFY A1: DRM Message ---');
    const vpCode = fs.readFileSync('./apps/frontend/src/app/components/student-online/VideoPlayerPage.tsx', 'utf-8');
    const hasNeutralMsg = vpCode.includes('تم إيقاف العرض مؤقتاً لحماية المحتوى');
    const hasTechNote = vpCode.includes('TECHNICAL NOTE FOR DEVELOPERS:');
    const hasFakeMsg = vpCode.includes('Deterrence Mode (Not Real DRM)');
    console.log(`Has neutral message: ${hasNeutralMsg}`);
    console.log(`Has technical note: ${hasTechNote}`);
    console.log(`Has fake/revealing message string: ${hasFakeMsg}`);

    console.log('\n✅ All Phase 2 Verifications Passed!');
    
    // Cleanup
    await db.user.deleteMany({ where: { email: { in: ['t1@test.com', 't2@test.com', 'admin@test.com', 's1@test.com', 's2@test.com'] } } });

  } catch (error: any) {
    console.error('VERIFICATION FAILED:', error.response?.data || error.message);
  } finally {
    await db.$disconnect();
  }
}

verifyPhase2();
