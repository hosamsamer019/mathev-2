import { PrismaClient } from '@prisma/client';
import express from 'express';
import http from 'http';
import * as jwt from 'jsonwebtoken';
import { getExamDetails } from './src/controllers/exam.controller';
import { getLessonDetails, getCourseDetails } from './src/controllers/course.controller';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-temporary-development-secret';

function containsForbiddenAnswerKeys(obj: any): boolean {
  if (!obj) return false;
  if (typeof obj !== 'object') return false;

  for (const key of Object.keys(obj)) {
    if (key === 'correctAnswer' || key === 'correct_answer') {
      return true;
    }
    if (typeof obj[key] === 'object') {
      if (containsForbiddenAnswerKeys(obj[key])) return true;
    }
  }
  return false;
}

async function testSec001And002Runtime() {
  console.log('--- START SEC-001 & SEC-002 RUNTIME VERIFICATION ---');
  let passed = 0;
  let failed = 0;

  const app = express();
  app.use(express.json());

  app.use((req: any, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        req.user = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }
    next();
  });

  app.get('/api/courses/exams/:id', getExamDetails);
  app.get('/api/courses/lessons/:id', getLessonDetails);
  app.get('/api/courses/:id', getCourseDetails);

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  let teacherA: any, teacherB: any, studentA: any, studentB: any;
  let courseA: any, courseB: any, lessonA: any, examA: any, attemptA: any, attemptB: any;

  try {
    const stamp = Date.now();
    // 1. Create DB Accounts
    teacherA = await prisma.user.create({ data: { email: `t_a_${stamp}@test.com`, password: 'p', name: 'Teacher A', role: 'TEACHER' } });
    teacherB = await prisma.user.create({ data: { email: `t_b_${stamp}@test.com`, password: 'p', name: 'Teacher B', role: 'TEACHER' } });
    studentA = await prisma.user.create({ data: { email: `s_a_${stamp}@test.com`, password: 'p', name: 'Student A', role: 'ONLINE_STUDENT' } });
    studentB = await prisma.user.create({ data: { email: `s_b_${stamp}@test.com`, password: 'p', name: 'Student B', role: 'ONLINE_STUDENT' } });

    // 2. Create Courses & Content
    courseA = await prisma.course.create({ data: { title: 'Math A', teacherId: teacherA.id, status: 'PUBLISHED' } });
    courseB = await prisma.course.create({ data: { title: 'Math B', teacherId: teacherB.id, status: 'PUBLISHED' } });

    // Enroll Student A in Course A only
    await prisma.courseEnrollment.create({ data: { studentId: studentA.id, courseId: courseA.id } });
    await prisma.courseEnrollment.create({ data: { studentId: studentB.id, courseId: courseB.id } });

    // Create Lesson with Quiz in Course A
    lessonA = await prisma.lesson.create({ data: { title: 'Lesson 1', courseId: courseA.id } });
    await prisma.lessonQuiz.create({
      data: {
        lessonId: lessonA.id,
        timestampSec: 30,
        question: 'What is 2 + 2?',
        options: ['3', '4', '5'],
        correctAnswer: '4'
      }
    });

    // Create Exam in Course A
    examA = await prisma.exam.create({
      data: {
        title: 'Exam 1',
        courseId: courseA.id,
        questions: [{ question: '5 * 5?', options: ['20', '25', '30'], correctAnswer: 1 }]
      }
    });

    // Create Assessment mirror for assessmentAttempt lookup
    await prisma.assessment.create({
      data: {
        id: examA.id,
        title: 'Exam 1',
        courseId: courseA.id,
        teacherId: teacherA.id,
        type: 'EXAM'
      }
    });

    // Create Attempts for Student A and Student B
    attemptA = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: examA.id,
        studentId: studentA.id,
        score: 95,
        status: 'GRADED'
      }
    });
    attemptB = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: examA.id,
        studentId: studentB.id,
        score: 70,
        status: 'GRADED'
      }
    });

    // Tokens
    const tokenStudentA = jwt.sign({ userId: studentA.id, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '15m' });
    const tokenStudentB = jwt.sign({ userId: studentB.id, role: 'ONLINE_STUDENT' }, JWT_SECRET, { expiresIn: '15m' });
    const tokenTeacherA = jwt.sign({ userId: teacherA.id, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '15m' });
    const tokenTeacherB = jwt.sign({ userId: teacherB.id, role: 'TEACHER' }, JWT_SECRET, { expiresIn: '15m' });

    // --- SEC-001 TESTS ---
    // Test 1: Student A fetches Exam A -> Returns only Student A attempt, NOT Student B attempt
    const resExamA = await fetch(`${baseUrl}/api/courses/exams/${examA.id}`, {
      headers: { 'Authorization': `Bearer ${tokenStudentA}` }
    });
    const examDataA = await resExamA.json();
    const containsStudentB = Array.isArray(examDataA.attempts) && examDataA.attempts.some((a: any) => a.studentId === studentB.id);
    const containsStudentA = Array.isArray(examDataA.attempts) && examDataA.attempts.some((a: any) => a.studentId === studentA.id);
    if (resExamA.status === 200 && containsStudentA && !containsStudentB) {
      console.log('✅ SEC-001 Test 1 Passed: Student A attempts view isolated to own attempts only (Student B attempt hidden).');
      passed++;
    } else {
      console.error(`❌ SEC-001 Test 1 Failed: Student B attempt leaked or Student A attempt missing!`);
      failed++;
    }

    // Test 2: Student B attempts to access Exam A details (not enrolled in Course A) -> 403 Forbidden
    const resExamB = await fetch(`${baseUrl}/api/courses/exams/${examA.id}`, {
      headers: { 'Authorization': `Bearer ${tokenStudentB}` }
    });
    if (resExamB.status === 403) {
      console.log('✅ SEC-001 Test 2 Passed: Student B denied access to un-enrolled course exam (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ SEC-001 Test 2 Failed: Expected 403, got ${resExamB.status}`);
      failed++;
    }

    // Test 3: Teacher B attempts to view Teacher A's exam -> 403 Forbidden
    const resTeacherB = await fetch(`${baseUrl}/api/courses/exams/${examA.id}`, {
      headers: { 'Authorization': `Bearer ${tokenTeacherB}` }
    });
    if (resTeacherB.status === 403) {
      console.log('✅ SEC-001 Test 3 Passed: Non-owner Teacher B denied access to Teacher A course exam (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ SEC-001 Test 3 Failed: Teacher B received unauthorized exam! Status: ${resTeacherB.status}`);
      failed++;
    }

    // Test 4: Authorized Teacher A retrieves exam -> 200 OK with all attempts
    const resTeacherA = await fetch(`${baseUrl}/api/courses/exams/${examA.id}`, {
      headers: { 'Authorization': `Bearer ${tokenTeacherA}` }
    });
    const teacherAData = await resTeacherA.json();
    if (resTeacherA.status === 200 && Array.isArray(teacherAData.attempts) && teacherAData.attempts.length === 2) {
      console.log('✅ SEC-001 Test 4 Passed: Course-owning Teacher A successfully retrieved all exam attempts.');
      passed++;
    } else {
      console.error(`❌ SEC-001 Test 4 Failed: Teacher A denied own course attempts! Status: ${resTeacherA.status}`);
      failed++;
    }

    // --- SEC-002 TESTS ---
    // Test 5: Student A gets Lesson details -> correctAnswer must be stripped
    const resLessonStudent = await fetch(`${baseUrl}/api/courses/lessons/${lessonA.id}`, {
      headers: { 'Authorization': `Bearer ${tokenStudentA}` }
    });
    const lessonDataStudent = await resLessonStudent.json();
    const hasLeakStudent = containsForbiddenAnswerKeys(lessonDataStudent);
    if (resLessonStudent.status === 200 && !hasLeakStudent) {
      console.log('✅ SEC-002 Test 5 Passed: Student lesson response contains NO correctAnswer leakage.');
      passed++;
    } else {
      console.error('❌ SEC-002 Test 5 Failed: correctAnswer found in student lesson response!');
      failed++;
    }

    // Test 6: Teacher A gets Lesson details -> correctAnswer retained for authoring
    const resLessonTeacher = await fetch(`${baseUrl}/api/courses/lessons/${lessonA.id}`, {
      headers: { 'Authorization': `Bearer ${tokenTeacherA}` }
    });
    const lessonDataTeacher = await resLessonTeacher.json();
    const teacherHasAnswer = lessonDataTeacher.quizzes && lessonDataTeacher.quizzes.some((q: any) => q.correctAnswer !== undefined);
    if (resLessonTeacher.status === 200 && teacherHasAnswer) {
      console.log('✅ SEC-002 Test 6 Passed: Teacher response retains correctAnswer for question authoring.');
      passed++;
    } else {
      console.error('❌ SEC-002 Test 6 Failed: Teacher response missing authoring answer keys.');
      failed++;
    }

    console.log(`\n--- SEC-001 & SEC-002 RUNTIME RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err: any) {
    console.error('❌ SEC-001/SEC-002 test error:', err.message);
    failed++;
  } finally {
    // Cleanup DB
    if (attemptA?.id) await prisma.assessmentAttempt.delete({ where: { id: attemptA.id } }).catch(() => {});
    if (attemptB?.id) await prisma.assessmentAttempt.delete({ where: { id: attemptB.id } }).catch(() => {});
    if (examA?.id) await prisma.assessment.delete({ where: { id: examA.id } }).catch(() => {});
    if (examA?.id) await prisma.exam.delete({ where: { id: examA.id } }).catch(() => {});
    if (lessonA?.id) await prisma.lesson.delete({ where: { id: lessonA.id } }).catch(() => {});
    if (courseA?.id) await prisma.course.delete({ where: { id: courseA.id } }).catch(() => {});
    if (courseB?.id) await prisma.course.delete({ where: { id: courseB.id } }).catch(() => {});
    if (studentA?.id) await prisma.user.delete({ where: { id: studentA.id } }).catch(() => {});
    if (studentB?.id) await prisma.user.delete({ where: { id: studentB.id } }).catch(() => {});
    if (teacherA?.id) await prisma.user.delete({ where: { id: teacherA.id } }).catch(() => {});
    if (teacherB?.id) await prisma.user.delete({ where: { id: teacherB.id } }).catch(() => {});
    server.close();
    await prisma.$disconnect();
  }

  if (failed > 0) process.exit(1);
}

testSec001And002Runtime();
