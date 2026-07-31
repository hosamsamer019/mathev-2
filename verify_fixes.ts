import { db } from './packages/database/src/index.js';
import { submitAttempt } from './services/course-service/src/controllers/exam.controller.js';
import { submitHomework } from './services/course-service/src/controllers/homework.controller.js';
import { ChatService } from './services/ai-service/src/services/chat.service.js';
import { examApi } from './apps/frontend/src/app/services/api.js';

async function verify() {
  console.log("=== SETUP ===");
  // Create test user, course, exam, homework
  const user = await db.user.create({ data: { email: `test${Date.now()}@test.com`, password: 'pw', name: 'Test User', role: 'ONLINE_STUDENT' } });
  const course = await db.course.create({ data: { title: 'Test Course', teacherId: user.id } });
  await db.courseEnrollment.create({ data: { studentId: user.id, courseId: course.id } });
  
  const exam = await db.exam.create({
    data: {
      title: 'Test Exam',
      courseId: course.id,
      questions: [
        { id: 'q1', correct: 0 },
        { id: 'q2', correct: 1 }
      ]
    }
  });

  const homework = await db.homework.create({
    data: {
      title: 'Test HW',
      courseId: course.id,
      questions: [
        { id: 'hq1', correct: 2 },
        { id: 'hq2', correct: 0 }
      ]
    }
  });

  console.log("\n=== VERIFY 1: Exam Grading ===");
  const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: any) => { res.data = data; return res; };
    return res;
  };

  // 1A. Normal attempt (1 correct, 1 wrong = 50%)
  const req1 = {
    params: { id: exam.id },
    user: { userId: user.id },
    body: { answers: [{ questionId: 'q1', selectedOption: 0 }, { questionId: 'q2', selectedOption: 0 }] } // q1 correct, q2 wrong
  };
  const res1 = mockRes();
  await submitAttempt(req1 as any, res1);
  console.log("Normal Submission Response:", res1.data);
  let attemptInDb = await db.examAttempt.findUnique({ where: { id: res1.data.attempt.id } });
  console.log("DB Row (Normal):", { id: attemptInDb?.id, score: attemptInDb?.score, answers: attemptInDb?.answers });

  // 1B. Malicious attempt (0 correct, but sends score: 100)
  const req2 = {
    params: { id: exam.id },
    user: { userId: user.id },
    body: { answers: [{ questionId: 'q1', selectedOption: 1 }, { questionId: 'q2', selectedOption: 0 }], score: 100 }
  };
  const res2 = mockRes();
  await submitAttempt(req2 as any, res2);
  console.log("Malicious Submission Response:", res2.data);
  let attemptInDb2 = await db.examAttempt.findUnique({ where: { id: res2.data.attempt.id } });
  console.log("DB Row (Malicious):", { id: attemptInDb2?.id, score: attemptInDb2?.score, answers: attemptInDb2?.answers });

  console.log("\n=== VERIFY 2: Exam Routing ===");
  // Ensure the actual resolved URL for examApi is correct
  const startUrl = examApi.getUri({ url: `/${exam.id}/start` });
  const submitUrl = examApi.getUri({ url: `/${exam.id}/submit` });
  console.log("Resolved Start URL:", startUrl);
  console.log("Resolved Submit URL:", submitUrl);

  console.log("\n=== VERIFY 3: Redis Fallback Rate Limiter ===");
  // Force simulate Redis offline by checking rate limit rapidly
  let allowed = 0;
  let blocked = 0;
  for (let i = 0; i < 12; i++) {
    const isAllowed = await ChatService.checkRateLimit(user.id);
    if (isAllowed) allowed++;
    else blocked++;
  }
  console.log(`Rate Limiter Results: ${allowed} allowed, ${blocked} blocked (Limit is 10)`);

  console.log("\n=== VERIFY 4: Homework Grading ===");
  const req3 = {
    params: { id: homework.id },
    user: { userId: user.id },
    body: { answers: [{ questionId: 'hq1', selectedOption: 2 }, { questionId: 'hq2', selectedOption: 0 }] } // Both correct = 100%
  };
  const res3 = mockRes();
  await submitHomework(req3 as any, res3);
  console.log("Homework Response Data:", res3.data);
  let hwSubmission = await db.submission.findUnique({ where: { id: res3.data.id } });
  console.log("Homework DB Row:", { id: hwSubmission?.id, grade: hwSubmission?.grade, answers: hwSubmission?.answers });

  process.exit(0);
}

verify().catch(console.error);
