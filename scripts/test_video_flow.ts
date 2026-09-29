import { PrismaClient } from '@smartmath/database';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const API_URL = 'http://localhost:4004/api/courses';

function makeToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function runVideoFlowTest() {
  console.log('====================================================');
  console.log('🎬 AL-SADEN VIDEO EXPERIENCE & PROGRESS TRACKING E2E');
  console.log('====================================================\n');

  try {
    // 1. Find or create two test students and a lesson
    let studentA = await prisma.user.findFirst({
      where: { email: 'video_student_a@test.com' }
    });
    if (!studentA) {
      studentA = await prisma.user.create({
        data: {
          email: 'video_student_a@test.com',
          name: 'طالب أ - تجربة الفيديو',
          role: 'ONLINE_STUDENT',
          password: 'dummy-hash'
        }
      });
    }

    let studentB = await prisma.user.findFirst({
      where: { email: 'video_student_b@test.com' }
    });
    if (!studentB) {
      studentB = await prisma.user.create({
        data: {
          email: 'video_student_b@test.com',
          name: 'طالب ب - تجربة الفيديو',
          role: 'ONLINE_STUDENT',
          password: 'dummy-hash'
        }
      });
    }

    // Find or create course & lesson
    let lesson = await prisma.lesson.findFirst({
      where: { videoUrl: { not: null } },
      include: { course: true }
    });

    if (!lesson) {
      let teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
      if (!teacher) {
        teacher = await prisma.user.create({
          data: {
            email: 'video_teacher@test.com',
            name: 'أستاذ الرياضيات',
            role: 'TEACHER',
            password: 'dummy-hash'
          }
        });
      }

      const course = await prisma.course.create({
        data: {
          title: 'دورة الرياضيات المتقدمة - تجربة الفيديو',
          description: 'دورة تجريبية لمشغل الفيديو الموحد',
          teacherId: teacher.id,
          status: 'PUBLISHED'
        }
      });

      lesson = await prisma.lesson.create({
        data: {
          title: 'الدرس الأول: المصفوفات والمحددات',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          courseId: course.id,
          duration: '35:20'
        },
        include: { course: true }
      });
    }

    // Enroll students
    const enrollA = await prisma.courseEnrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: studentA.id,
          courseId: lesson.courseId
        }
      },
      update: {},
      create: {
        studentId: studentA.id,
        courseId: lesson.courseId
      }
    });

    const enrollB = await prisma.courseEnrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: studentB.id,
          courseId: lesson.courseId
        }
      },
      update: {},
      create: {
        studentId: studentB.id,
        courseId: lesson.courseId
      }
    });

    // Reset test progress for clean slate
    await prisma.videoProgress.deleteMany({
      where: {
        lessonId: lesson.id,
        studentId: { in: [studentA.id, studentB.id] }
      }
    });

    console.log(`✅ Preconditions ready:`);
    console.log(`   - Lesson: "${lesson.title}" (${lesson.id})`);
    console.log(`   - Student A: ${studentA.email} (${studentA.id})`);
    console.log(`   - Student B: ${studentB.email} (${studentB.id})\n`);

    const tokenA = makeToken(studentA);
    const tokenB = makeToken(studentB);

    // ==========================================
    // STEP 1: Student A opens lesson (LESSON_OPENED)
    // ==========================================
    console.log('🔹 Step 1: Student A opens lesson...');
    const resOpen = await axios.post(
      `${API_URL}/lessons/${lesson.id}/events`,
      { eventType: 'LESSON_OPENED' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    console.log('   API Response Status:', resOpen.status, resOpen.data.message);

    const dbOpen = await prisma.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId: studentA.id, lessonId: lesson.id } }
    });
    console.log('   PostgreSQL Record Status:', dbOpen?.status, '| firstOpenedAt:', dbOpen?.firstOpenedAt ? 'SET' : 'NULL');
    if (dbOpen?.status !== 'LESSON_OPENED') throw new Error('Failed: status should be LESSON_OPENED');

    // ==========================================
    // STEP 2: Student A starts watching (VIDEO_PLAYING & PROGRESS_TICK at 15s)
    // ==========================================
    console.log('\n🔹 Step 2: Student A watches 15 seconds (VIDEO_PLAYING + PROGRESS_TICK)...');
    await axios.post(
      `${API_URL}/lessons/${lesson.id}/events`,
      { eventType: 'VIDEO_PLAYING' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const resTick = await axios.post(
      `${API_URL}/lessons/${lesson.id}/events`,
      {
        eventType: 'VIDEO_PROGRESS_TICK',
        playedSeconds: 15,
        progress: 25.5,
        lastTimestamp: 15.4
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    console.log('   API Progress Tick Response:', resTick.data.message);

    // ==========================================
    // STEP 3: Student A pauses video (VIDEO_PAUSED)
    // ==========================================
    console.log('\n🔹 Step 3: Student A pauses video at 15.4s...');
    await axios.post(
      `${API_URL}/lessons/${lesson.id}/events`,
      { eventType: 'VIDEO_PAUSED' },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    // ==========================================
    // STEP 4: Direct PostgreSQL Verification for Student A
    // ==========================================
    console.log('\n🔹 Step 4: Verifying PostgreSQL persistence for Student A...');
    const dbStudentA = await prisma.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId: studentA.id, lessonId: lesson.id } }
    });
    console.log('   PostgreSQL VideoProgress Record:');
    console.log('   - lastTimestamp:', dbStudentA?.lastTimestamp, '(Expected: 15.4)');
    console.log('   - progress:', dbStudentA?.progress, '(Expected: 25.5)');
    console.log('   - totalWatchTimeSec:', dbStudentA?.totalWatchTimeSec, '(Expected: 15)');
    console.log('   - status:', dbStudentA?.status, '(Expected: IN_PROGRESS)');
    console.log('   - watched:', dbStudentA?.watched, '(Expected: false)');

    if (Math.abs((dbStudentA?.lastTimestamp || 0) - 15.4) > 0.01) {
      throw new Error('Database lastTimestamp mismatch!');
    }
    if (Math.abs((dbStudentA?.progress || 0) - 25.5) > 0.01) {
      throw new Error('Database progress percentage mismatch!');
    }

    // ==========================================
    // STEP 5: Resume Position Verification via API
    // ==========================================
    console.log('\n🔹 Step 5: Testing Resume Playback (getLessonDetails API)...');
    const resDetailsA = await axios.get(
      `${API_URL}/lessons/${lesson.id}`,
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const returnedProgressA = resDetailsA.data.progress?.[0];
    console.log('   API Returned lastTimestamp for resume:', returnedProgressA?.lastTimestamp);
    console.log('   API Returned progress for resume:', returnedProgressA?.progress);

    if (Math.abs((returnedProgressA?.lastTimestamp || 0) - 15.4) > 0.01) {
      throw new Error('API resume position mismatch!');
    }

    // ==========================================
    // STEP 6: Student Isolation Verification (Student B)
    // ==========================================
    console.log('\n🔹 Step 6: Testing Student Isolation (Student B)...');
    const resDetailsB = await axios.get(
      `${API_URL}/lessons/${lesson.id}`,
      { headers: { Authorization: `Bearer ${tokenB}` } }
    );
    const returnedProgressB = resDetailsB.data.progress;
    console.log('   Student B Progress Record Count:', returnedProgressB?.length || 0);

    const dbStudentB = await prisma.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId: studentB.id, lessonId: lesson.id } }
    });
    console.log('   Student B PostgreSQL Record:', dbStudentB ? 'EXISTS' : 'NULL (Correct - No activity yet)');

    if (returnedProgressB && returnedProgressB.length > 0) {
      throw new Error('Student isolation failure: Student B sees Student A progress!');
    }

    // ==========================================
    // STEP 7: Complete Video Playback (VIDEO_COMPLETED)
    // ==========================================
    console.log('\n🔹 Step 7: Student A completes video (VIDEO_COMPLETED)...');
    await axios.post(
      `${API_URL}/lessons/${lesson.id}/events`,
      {
        eventType: 'VIDEO_COMPLETED',
        playedSeconds: 45,
        progress: 100,
        lastTimestamp: 60.0
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const dbCompleted = await prisma.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId: studentA.id, lessonId: lesson.id } }
    });
    console.log('   PostgreSQL Completed State:');
    console.log('   - watched:', dbCompleted?.watched, '(Expected: true)');
    console.log('   - status:', dbCompleted?.status, '(Expected: COMPLETED)');
    console.log('   - completedAt:', dbCompleted?.completedAt ? dbCompleted.completedAt.toISOString() : 'NULL');
    console.log('   - completionSource:', dbCompleted?.completionSource, '(Expected: VIDEO_PLAYER)');

    if (!dbCompleted?.watched || dbCompleted?.status !== 'COMPLETED' || !dbCompleted?.completedAt) {
      throw new Error('Video completion tracking failed in PostgreSQL!');
    }

    // ==========================================
    // STEP 8: Security & Authorization Audit
    // ==========================================
    console.log('\n🔹 Step 8: Security & Authorization Audit...');

    // 8a. Unauthenticated request must return 401
    try {
      await axios.post(`${API_URL}/lessons/${lesson.id}/events`, { eventType: 'LESSON_OPENED' });
      throw new Error('Security failure: Unauthenticated event update succeeded!');
    } catch (e: any) {
      if (e.response?.status === 401) {
        console.log('   ✅ 8a. Unauthenticated request correctly rejected with 401 Unauthorized');
      } else {
        throw e;
      }
    }

    // 8b. Unenrolled student must return 403
    let studentUnenrolled = await prisma.user.findFirst({
      where: { email: 'unenrolled_student@test.com' }
    });
    if (!studentUnenrolled) {
      studentUnenrolled = await prisma.user.create({
        data: {
          email: 'unenrolled_student@test.com',
          name: 'طالب غير مشترك',
          role: 'ONLINE_STUDENT',
          password: 'dummy-hash'
        }
      });
    }
    const tokenUnenrolled = makeToken(studentUnenrolled);

    try {
      await axios.post(
        `${API_URL}/lessons/${lesson.id}/events`,
        { eventType: 'LESSON_OPENED' },
        { headers: { Authorization: `Bearer ${tokenUnenrolled}` } }
      );
      throw new Error('Security failure: Unenrolled student event update succeeded!');
    } catch (e: any) {
      if (e.response?.status === 403) {
        console.log('   ✅ 8b. Unenrolled student request correctly rejected with 403 Forbidden');
      } else {
        throw e;
      }
    }

    // 8c. Forged studentId in body must be ignored (server binds strictly to JWT)
    await axios.post(
      `${API_URL}/lessons/${lesson.id}/events`,
      {
        eventType: 'VIDEO_PROGRESS_TICK',
        playedSeconds: 10,
        progress: 99,
        lastTimestamp: 999,
        studentId: studentB.id // Attempting to forge Student B's progress while authenticated as Student A
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const dbForgedCheckB = await prisma.videoProgress.findUnique({
      where: { studentId_lessonId: { studentId: studentB.id, lessonId: lesson.id } }
    });
    if (dbForgedCheckB && dbForgedCheckB.lastTimestamp === 999) {
      throw new Error('Security failure: Student A was able to alter Student B progress via forged studentId in body!');
    }
    console.log('   ✅ 8c. Spoofed studentId in body was ignored by backend (JWT-enforced identity)');

    // Clean up test users & progress
    await prisma.videoProgress.deleteMany({
      where: { studentId: { in: [studentA.id, studentB.id, studentUnenrolled.id] } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['unenrolled_student@test.com'] } }
    });

    console.log('\n====================================================');
    console.log('🎉 ALL VIDEO FLOW, SECURITY & DB TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Video flow test error:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVideoFlowTest();
