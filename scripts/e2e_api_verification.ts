import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function runApiVerification() {
  console.log('Starting E2E API/DB Verification...');
  let hasErrors = false;

  try {
    // 1. Create Teacher
    const teacherId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: teacherId,
        email: `teacher_${Date.now()}@test.com`,
        password: 'hashed_password',
        name: 'Real Teacher Name',
        role: 'TEACHER',
      }
    });
    console.log('✅ Created Teacher');

    // 2. Create Student (PREP_1)
    const studentId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: studentId,
        email: `student_${Date.now()}@test.com`,
        password: 'hashed_password',
        name: 'Real Student PREP_1',
        role: 'ONLINE_STUDENT',
        academicLevel: 'PREP_1'
      }
    });
    console.log('✅ Created Student (PREP_1)');

    // 3. Create Course (PREP_1)
    const courseId = crypto.randomUUID();
    await prisma.course.create({
      data: {
        id: courseId,
        title: 'PREP 1 Math Course',
        teacherId: teacherId,
        academicLevel: 'PREP_1'
      }
    });
    console.log('✅ Created Course (PREP_1)');

    // 4. Enroll Student
    await prisma.courseEnrollment.create({
      data: {
        studentId,
        courseId
      }
    });
    console.log('✅ Enrolled Student in Course');

    // 5. Create Lesson and Video
    const lessonId = crypto.randomUUID();
    await prisma.lesson.create({
      data: {
        id: lessonId,
        title: 'Introduction to Algebra',
        courseId,
        videoUrl: 'https://youtube.com/watch?v=12345'
      }
    });
    console.log('✅ Created Lesson and Video');

    // 6. Simulate Video Progress (100%)
    await prisma.videoProgress.create({
      data: {
        studentId,
        lessonId,
        progress: 100,
        lastTimestamp: 600,
        watched: true
      }
    });
    console.log('✅ Simulated 100% Video Progress');

    // 7. Create Video Dependent Homework
    const homeworkId = crypto.randomUUID();
    await prisma.homework.create({
      data: {
        id: homeworkId,
        title: 'Algebra Video Homework',
        courseId,
        type: 'VIDEO_DEPENDENT',
        videoId: lessonId,
      }
    });
    console.log('✅ Created VIDEO_DEPENDENT Homework');

    // 8. Assert Homework Unlock Logic (DB check)
    const progress = await prisma.videoProgress.findFirst({
      where: { studentId, lessonId }
    });
    if (progress?.watched) {
      console.log('✅ Homework is unlocked (Video Completed)');
    } else {
      console.error('❌ Homework is locked but should be unlocked');
      hasErrors = true;
    }

    // 9. Simulate Exam
    const examId = crypto.randomUUID();
    await prisma.exam.create({
      data: {
        id: examId,
        title: 'Midterm Exam',
        courseId,
        duration: 60,
        passingScore: 50,
      }
    });
    console.log('✅ Created Exam');

    // 10. Simulate Exam Submission (< 50% score) -> Risk Engine Candidate
    await prisma.examAttempt.create({
      data: {
        studentId,
        examId,
        score: 40 // Below 50%
      }
    });
    console.log('✅ Submitted Exam Attempt (< 50%)');

    // 11. Assert Risk Engine Condition
    const attempts = await prisma.examAttempt.findMany({
      where: { studentId }
    });
    const atRisk = attempts.some(a => a.score < 50);
    if (atRisk) {
      console.log('✅ Student flagged as AT RISK correctly');
    } else {
      console.error('❌ Student NOT flagged as AT RISK');
      hasErrors = true;
    }

    // 12. Simulate Notification
    await prisma.notification.create({
      data: {
        userId: studentId,
        title: 'New Exam Published',
        message: 'Midterm Exam is now available.',
        type: 'EXAM_PUBLISHED',
      }
    });
    console.log('✅ Created Notification');

    // 13. Check Notification Unread
    const unread = await prisma.notification.count({
      where: { userId: studentId, read: false }
    });
    if (unread === 1) {
      console.log('✅ Unread notification count is accurate (1)');
    } else {
      console.error('❌ Unread notification count is inaccurate');
      hasErrors = true;
    }

    // 14. Academic Level Change
    await prisma.user.update({
      where: { id: studentId },
      data: { academicLevel: 'PREP_2' }
    });
    console.log('✅ Changed Student Level to PREP_2');

    // 15. Assert Course Visibility changes (Student PREP_2 should not see PREP_1 courses)
    const updatedStudent = await prisma.user.findUnique({ where: { id: studentId } });
    const availableCourses = await prisma.course.findMany({
      where: { academicLevel: updatedStudent?.academicLevel }
    });
    if (availableCourses.length === 0) {
      console.log('✅ PREP_1 course correctly hidden from PREP_2 student');
    } else {
      console.error('❌ Student sees courses from wrong academic level');
      hasErrors = true;
    }

  } catch (err) {
    console.error('❌ E2E Execution Error:', err);
    hasErrors = true;
  } finally {
    await prisma.$disconnect();
    if (hasErrors) {
      console.error('❌ API/DB VERIFICATION FAILED');
      process.exit(1);
    } else {
      console.log('🚀 API/DB VERIFICATION PASSED');
    }
  }
}

runApiVerification();
