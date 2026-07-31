import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING SMART GENERATION VERIFICATION ---');

  // Register Teacher
  const tRes = await axios.post('http://localhost:4001/api/auth/register', { 
    name: 'AI Teacher', 
    email: `ait_${Date.now()}@edu.com`, 
    password: 'password123', 
    role: 'TEACHER' 
  });
  const t = { id: tRes.data.user.id, config: { headers: { Authorization: `Bearer ${tRes.data.token}` } } };

  // 1. Real Generation
  console.log('\n--- 1. Real Generation Call ---');
  const genRes = await axios.post('http://localhost:4003/api/ai/generate-questions', {
    topic: 'الكسور',
    difficulty: 'متوسط',
    count: 3 // Keep it 3 to save time/tokens during test
  }, t.config);
  
  console.log('Generated questions:', JSON.stringify(genRes.data.questions, null, 2));
  console.log('Tokens used:', genRes.data.tokensUsed);

  // 2. Edit & Save (Frontend Simulation)
  console.log('\n--- 2. Edit & Save to Bank ---');
  const questionsToSave = genRes.data.questions;
  // Modify the first question
  questionsToSave[0].text = '[معدل يدويًا] ' + questionsToSave[0].text;
  
  // Save to bank
  let savedQId = '';
  for (const q of questionsToSave) {
    const sRes = await axios.post('http://localhost:4004/api/questions', {
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      tag: 'الكسور'
    }, t.config);
    if (!savedQId) savedQId = sRes.data.id;
  }
  console.log(`Saved 3 questions to bank. Sample ID: ${savedQId}`);

  // Fetch from bank to prove edit
  const bankRes = await axios.get('http://localhost:4004/api/questions?tag=الكسور', t.config);
  console.log(`First question in bank: ${bankRes.data[0].text}`);

  // 3. Grading & Usage
  console.log('\n--- 3. Grading Integration ---');
  // Create course
  const courseRes = await axios.post('http://localhost:4004/api/courses', { title: 'AI Course', description: 'Desc' }, t.config);
  const courseId = courseRes.data.id;
  
  // Register student
  const sRes = await axios.post('http://localhost:4001/api/auth/register', { 
    name: 'AI Student', 
    email: `ais_${Date.now()}@edu.com`, 
    password: 'password123', 
    role: 'ONLINE_STUDENT' 
  });
  const student = { id: sRes.data.user.id, config: { headers: { Authorization: `Bearer ${sRes.data.token}` } } };
  await prisma.courseEnrollment.create({ data: { studentId: student.id, courseId: courseId } });

  // Create Exam
  const examPayload = {
    title: 'Fractions Test',
    type: 'اختبار',
    courseId,
    questions: [
      { id: 1, type: 'mcq', text: bankRes.data[0].text, options: bankRes.data[0].options, correct: bankRes.data[0].correctAnswer }
    ]
  };
  const examRes = await axios.post('http://localhost:4004/api/exams', examPayload, t.config);
  const examId = examRes.data.id;

  // Student takes exam (answer correctly)
  await axios.post(`http://localhost:4004/api/exams/${examId}/start`, {}, student.config);
  const submitRes = await axios.post(`http://localhost:4004/api/exams/${examId}/submit`, {
    answers: [{ questionId: 1, selectedOption: bankRes.data[0].correctAnswer }]
  }, student.config);
  console.log(`Student graded score on AI question: ${submitRes.data.score}%`);

  // 4. Rate Limiting Test
  console.log('\n--- 4. Rate Limiting Test ---');
  let hitLimit = false;
  let requests = 0;
  try {
    for (let i = 0; i < 11; i++) {
      requests++;
      await axios.post('http://localhost:4003/api/ai/generate-questions', {
        topic: 'Test', difficulty: 'سهل', count: 1
      }, t.config);
    }
  } catch (error: any) {
    if (error.response?.status === 429) {
      hitLimit = true;
      console.log(`Successfully hit rate limit (429) on request #${requests}`);
    } else {
      console.error('Unexpected error during rate limit test:', error.response?.status);
    }
  }
  
  if (!hitLimit) {
    console.warn('Did not hit rate limit!');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
