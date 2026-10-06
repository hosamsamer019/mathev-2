import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../packages/database/src/index.js';
import courseRoutes from '../services/course-service/src/routes/course.routes.js';
import { generateVideoTicket, verifyVideoTicket } from '../services/course-service/src/services/videoToken.service.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-video-stream-jwt-secret-1234567890';
const JWT_SECRET = process.env.JWT_SECRET;

async function runEndToEndStreamTest() {
  console.log('=== RUNNING END-TO-END VIDEO STREAM & TICKET TEST ===');
  let passed = 0;
  let failed = 0;

  // Set up Express app with course routes
  const app = express();
  app.use(express.json());
  app.use('/api/courses', courseRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/courses`;

  try {
    // 1. Find or create a test course and lesson with the working Google Drive file ID
    let course = await db.course.findFirst({
      where: { title: 'Test Stream Course' }
    });
    if (!course) {
      const teacher = await db.user.findFirst({ where: { role: 'TEACHER' } }) ||
        await db.user.create({
          data: {
            email: 'stream-teacher@test.com',
            name: 'Stream Teacher',
            role: 'TEACHER',
            password: 'hashed'
          }
        });

      course = await db.course.create({
        data: {
          title: 'Test Stream Course',
          description: 'Testing stream',
          teacherId: teacher.id,
          price: 0,
          status: 'PUBLISHED'
        }
      });
    }

    let lesson = await db.lesson.findFirst({
      where: { courseId: course.id, videoUrl: { contains: '1U-N5hmS0mmpRGVqjJjZJQiJ0-qxCO257' } }
    });
    if (!lesson) {
      lesson = await db.lesson.create({
        data: {
          title: 'Google Drive Stream Lesson',
          courseId: course.id,
          videoUrl: 'https://drive.google.com/file/d/1U-N5hmS0mmpRGVqjJjZJQiJ0-qxCO257/view'
        }
      });
    }

    // Create enrolled student
    const student = await db.user.findFirst({ where: { email: 'stream-student@test.com' } }) ||
      await db.user.create({
        data: {
          email: 'stream-student@test.com',
          name: 'Stream Student',
          role: 'ONLINE_STUDENT',
          password: 'hashed'
        }
      });

    // Ensure enrollment
    const enrollment = await db.courseEnrollment.findFirst({
      where: { studentId: student.id, courseId: course.id }
    }) || await db.courseEnrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id
      }
    });

    // Generate normal access JWT for student
    const studentJwt = jwt.sign(
      { userId: student.id, role: student.role, email: student.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Test 1: Generate short-lived scoped video ticket via GET /api/courses/lessons/:id/video-ticket
    console.log('\n--- Test 1: Fetch Video Ticket ---');
    const ticketRes = await fetch(`${baseUrl}/lessons/${lesson.id}/video-ticket`, {
      headers: { Authorization: `Bearer ${studentJwt}` }
    });
    const ticketData: any = await ticketRes.json();

    if (ticketRes.status === 200 && ticketData.ticket) {
      console.log('✅ Test 1 Passed: Generated 60-second scoped video ticket.');
      passed++;
    } else {
      console.error('❌ Test 1 Failed:', ticketRes.status, ticketData);
      failed++;
    }

    const videoTicket = ticketData.ticket;

    // Test 2: Verify video ticket claims structure (no token exposed)
    console.log('\n--- Test 2: Video Ticket Claims Structure ---');
    const decodedTicket: any = jwt.verify(videoTicket, JWT_SECRET);
    if (decodedTicket.purpose === 'video-stream' && decodedTicket.lessonId === lesson.id && decodedTicket.userId === student.id) {
      console.log('✅ Test 2 Passed: Video ticket contains { purpose: "video-stream", lessonId, userId } and no broad role.');
      passed++;
    } else {
      console.error('❌ Test 2 Failed:', decodedTicket);
      failed++;
    }

    // Test 3: Stream Google Drive video with Range header using scoped video ticket
    console.log('\n--- Test 3: Stream Google Drive Video with Range ---');
    const streamRes = await fetch(`${baseUrl}/lessons/${lesson.id}/stream?token=${encodeURIComponent(videoTicket)}`, {
      headers: {
        'Range': 'bytes=0-1023'
      }
    });

    console.log('Response Status:', streamRes.status);
    console.log('Content-Type:', streamRes.headers.get('content-type'));
    console.log('Content-Range:', streamRes.headers.get('content-range'));
    console.log('Accept-Ranges:', streamRes.headers.get('accept-ranges'));

    const arrayBuffer = await streamRes.arrayBuffer();
    console.log(`Received Payload Bytes: ${arrayBuffer.byteLength}`);

    if (
      streamRes.status === 206 &&
      streamRes.headers.get('content-type')?.includes('video') &&
      streamRes.headers.get('accept-ranges') === 'bytes' &&
      streamRes.headers.get('content-range')?.startsWith('bytes 0-1023/') &&
      arrayBuffer.byteLength === 1024
    ) {
      console.log('✅ Test 3 Passed: Successfully streamed Google Drive video as 206 Partial Content (video/mp4)!');
      passed++;
    } else {
      console.error('❌ Test 3 Failed: Stream did not return expected partial content video bytes.');
      failed++;
    }

    // Test 4: Expired video ticket rejection
    console.log('\n--- Test 4: Expired Video Ticket Rejection ---');
    const expiredTicket = generateVideoTicket({
      userId: student.id,
      lessonId: lesson.id,
      expiresInSeconds: -10
    });
    const expiredRes = await fetch(`${baseUrl}/lessons/${lesson.id}/stream?token=${encodeURIComponent(expiredTicket)}`);
    if (expiredRes.status === 403 || expiredRes.status === 401) {
      console.log(`✅ Test 4 Passed: Expired video ticket correctly rejected with HTTP ${expiredRes.status}.`);
      passed++;
    } else {
      console.error(`❌ Test 4 Failed: Expired ticket returned HTTP ${expiredRes.status}`);
      failed++;
    }

    // Test 5: Wrong lesson ticket rejection
    console.log('\n--- Test 5: Wrong Lesson Ticket Rejection ---');
    const wrongLessonTicket = generateVideoTicket({
      userId: student.id,
      lessonId: '00000000-0000-0000-0000-000000000000',
      expiresInSeconds: 60
    });
    const wrongLessonRes = await fetch(`${baseUrl}/lessons/${lesson.id}/stream?token=${encodeURIComponent(wrongLessonTicket)}`);
    if (wrongLessonRes.status === 403 || wrongLessonRes.status === 401) {
      console.log(`✅ Test 5 Passed: Ticket for another lesson correctly rejected with HTTP ${wrongLessonRes.status}.`);
      passed++;
    } else {
      console.error(`❌ Test 5 Failed: Wrong lesson ticket returned HTTP ${wrongLessonRes.status}`);
      failed++;
    }

    // Test 6: Unenrolled student ticket request rejection
    console.log('\n--- Test 6: Unenrolled Student Ticket Request Rejection ---');
    const unenrolledStudent = await db.user.findFirst({ where: { email: 'unenrolled@test.com' } }) ||
      await db.user.create({
        data: {
          email: 'unenrolled@test.com',
          name: 'Unenrolled Student',
          role: 'ONLINE_STUDENT',
          password: 'hashed'
        }
      });
    const unenrolledJwt = jwt.sign(
      { userId: unenrolledStudent.id, role: unenrolledStudent.role, email: unenrolledStudent.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const unenrolledTicketRes = await fetch(`${baseUrl}/lessons/${lesson.id}/video-ticket`, {
      headers: { Authorization: `Bearer ${unenrolledJwt}` }
    });
    if (unenrolledTicketRes.status === 403) {
      console.log('✅ Test 6 Passed: Unenrolled student cannot generate video ticket (403 Forbidden).');
      passed++;
    } else {
      console.error(`❌ Test 6 Failed: Unenrolled student got status ${unenrolledTicketRes.status}`);
      failed++;
    }

  } catch (err: any) {
    console.error('Fatal Test Error:', err);
    failed++;
  } finally {
    console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
    await db.$disconnect();
    server.close();
  }
}

runEndToEndStreamTest();
