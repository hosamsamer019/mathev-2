import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING MIXED-SOURCE EXAM GRADING VERIFICATION ---');

  const targetExamId = '1bffd0c4-849d-4cf8-a9e6-87c31472ef17';

  // 1. Verify Exam Exists and Get Course
  const exam = await prisma.exam.findUnique({ where: { id: targetExamId } });
  if (!exam) {
    console.error(`Exam ${targetExamId} not found in DB. Did the DB reset?`);
    return;
  }
  console.log(`Found exam: ${exam.title} in course: ${exam.courseId}`);

  // 2. Register fresh student and enroll
  const sRes = await axios.post('http://localhost:4001/api/auth/register', { 
    name: 'Test Student 2', 
    email: `s2_${Date.now()}@edu.com`, 
    password: 'password123', 
    role: 'ONLINE_STUDENT' 
  });
  const student = { id: sRes.data.user.id, config: { headers: { Authorization: `Bearer ${sRes.data.token}` } } };
  
  await prisma.courseEnrollment.create({ data: { studentId: student.id, courseId: exam.courseId } });
  console.log('Registered new student and enrolled in the course.');

  // The exam has 3 questions.
  // 1. Q2 from bank (Correct: 1) -> id: 1
  // 2. Q1 from bank (Correct: 0) -> id: 2
  // 3. Inline Question (Correct: 0) -> id: 3
  
  // 3. Student Starts Exam
  console.log('\n--- Normal Submission ---');
  await axios.post(`http://localhost:4004/api/exams/${targetExamId}/start`, {}, student.config);
  
  // Submit answers (1 correct, 2 wrong)
  // Let's answer q1 (id:1) correctly (option 1), q2 (id:2) wrong (option 1), q3 (id:3) wrong (option 1)
  const answersPayload = {
    answers: [
      { questionId: 1, selectedOption: 1 }, // Correct
      { questionId: 2, selectedOption: 1 }, // Wrong (correct is 0)
      { questionId: 3, selectedOption: 1 }  // Wrong (correct is 0)
    ]
  };

  const normalRes = await axios.post(`http://localhost:4004/api/exams/${targetExamId}/submit`, answersPayload, student.config);
  console.log(`Submitting answers: ${JSON.stringify(answersPayload.answers)}`);
  console.log(`Real returned score: ${normalRes.data.score} (Expected ~33.33)`);

  // 4. Spoofed Submission
  console.log('\n--- Spoofed Submission ---');
  // Start another attempt
  await axios.post(`http://localhost:4004/api/exams/${targetExamId}/start`, {}, student.config);
  
  // Submit same wrong answers, but spoof score to 100
  const spoofedPayload = {
    answers: [
      { questionId: 1, selectedOption: 1 }, // Correct
      { questionId: 2, selectedOption: 1 }, // Wrong
      { questionId: 3, selectedOption: 1 }  // Wrong
    ],
    score: 100 // malicious student tries to set score
  };

  const spoofedRes = await axios.post(`http://localhost:4004/api/exams/${targetExamId}/submit`, spoofedPayload, student.config);
  console.log(`Submitting payload with spoofed score: ${JSON.stringify(spoofedPayload)}`);
  console.log(`Real returned score after spoof attempt: ${spoofedRes.data.score} (Expected ~33.33, NOT 100)`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
