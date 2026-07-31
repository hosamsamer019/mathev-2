import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING QUESTION BANK VERIFICATION ---');

  // Create Users
  const t1Res = await axios.post('http://localhost:4001/api/auth/register', { name: 'Teacher 1', email: `t1_${Date.now()}@edu.com`, password: 'password123', role: 'TEACHER' });
  const t1 = { id: t1Res.data.user.id, config: { headers: { Authorization: `Bearer ${t1Res.data.token}` } } };

  const t2Res = await axios.post('http://localhost:4001/api/auth/register', { name: 'Teacher 2', email: `t2_${Date.now()}@edu.com`, password: 'password123', role: 'TEACHER' });
  const t2 = { id: t2Res.data.user.id, config: { headers: { Authorization: `Bearer ${t2Res.data.token}` } } };

  const s1Res = await axios.post('http://localhost:4001/api/auth/register', { name: 'Student 1', email: `s1_${Date.now()}@edu.com`, password: 'password123', role: 'ONLINE_STUDENT' });
  const s1 = { id: s1Res.data.user.id, config: { headers: { Authorization: `Bearer ${s1Res.data.token}` } } };

  const adminRes = await axios.post('http://localhost:4001/api/auth/register', { name: 'Admin', email: `a_${Date.now()}@edu.com`, password: 'password123', role: 'ADMIN' });
  const adminConfig = { headers: { Authorization: `Bearer ${adminRes.data.token}` } };

  // 1. Teacher 1 creates 3 questions
  console.log('\n--- 1. Teacher 1 Creating Questions ---');
  const q1 = await axios.post('http://localhost:4004/api/questions', { text: 'Q1 from bank', options: ['A','B','C','D'], correctAnswer: 0, tag: 'جبر' }, t1.config);
  const q2 = await axios.post('http://localhost:4004/api/questions', { text: 'Q2 from bank', options: ['A','B','C','D'], correctAnswer: 1, tag: 'جبر' }, t1.config);
  const q3 = await axios.post('http://localhost:4004/api/questions', { text: 'Q3 from bank', options: ['A','B','C','D'], correctAnswer: 2, tag: 'هندسة' }, t1.config);
  console.log(`Teacher 1 created 3 questions. Bank count: 3`);

  // 2. Teacher builds exam
  console.log('\n--- 2. Teacher 1 Builds Exam ---');
  const courseRes = await axios.post('http://localhost:4004/api/courses', { title: 'Algebra 101', description: 'Desc' }, t1.config);
  const courseId = courseRes.data.id;
  await prisma.courseEnrollment.create({ data: { studentId: s1.id, courseId: courseId } });

  const bankQuestions = await axios.get('http://localhost:4004/api/questions?tag=جبر', t1.config);
  console.log(`Teacher 1 searched 'جبر' and found: ${bankQuestions.data.length} questions`);

  const examPayload = {
    title: 'Algebra Midterm',
    type: 'امتحان',
    duration: 60,
    courseId: courseId,
    requiresCamera: false,
    questions: [
      { id: 1, type: 'mcq', text: bankQuestions.data[0].text, options: bankQuestions.data[0].options, correct: bankQuestions.data[0].correctAnswer },
      { id: 2, type: 'mcq', text: bankQuestions.data[1].text, options: bankQuestions.data[1].options, correct: bankQuestions.data[1].correctAnswer },
      { id: 3, type: 'mcq', text: 'Inline Question', options: ['Yes', 'No', 'Maybe', 'Never'], correct: 0 }
    ]
  };

  const examRes = await axios.post('http://localhost:4004/api/exams', examPayload, t1.config);
  const examId = examRes.data.id;
  console.log(`Exam created with ID: ${examId}`);

  // 3. Show actual saved exam questions
  console.log('\n--- 3. Saved Exam Questions ---');
  const examFromDb = await prisma.exam.findUnique({ where: { id: examId } });
  const questionsJson = examFromDb?.questions as any[];
  console.log(`Exam has ${questionsJson.length} questions:`);
  questionsJson.forEach((q, i) => console.log(`  ${i+1}. ${q.text} (Correct: ${q.correct})`));

  // 5. Scoping
  console.log('\n--- 5. Question Bank Scoping ---');
  const t2Questions = await axios.get('http://localhost:4004/api/questions', t2.config);
  console.log(`Teacher 2 question bank count: ${t2Questions.data.length} (expected 0)`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
