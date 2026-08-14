/**
 * Live API verification: login as a student, then fetch the math exam 
 * and verify the API returns normalized question data.
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'packages/database/.env' });

const AUTH_URL = 'http://localhost:4001';
const COURSE_URL = 'http://localhost:4004';

// The math exam with matrix questions
const MATH_EXAM_ID = '529f10f6-6bff-4c5b-9f3e-78d1a50c3da2'; // "اختبار 3"

async function login(email: string, password: string, role: string): Promise<string> {
  const res = await fetch(`${AUTH_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }
  const data = await res.json() as any;
  return data.token || data.accessToken;
}

async function getExam(examId: string, token: string): Promise<any> {
  const res = await fetch(`${COURSE_URL}/api/courses/exams/${examId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json() as any;
  return { status: res.status, data };
}

async function main() {
  console.log('\n========================================');
  console.log('  LIVE API EXAM NORMALIZATION VERIFICATION');
  console.log('========================================\n');

  let token: string;
  
  // Try to login as a teacher (should be able to access exams)
  const credentials = [
    { email: 'admin@test.com', password: 'password', role: 'ADMIN' },
    { email: 'teacher_e2e@test.com', password: 'password123', role: 'TEACHER' },
    { email: 'test@teacher.com', password: 'password', role: 'TEACHER' },
  ];
  
  let loggedIn = false;
  for (const cred of credentials) {
    try {
      token = await login(cred.email, cred.password, cred.role);
      console.log(`✅ Logged in as: ${cred.email}`);
      loggedIn = true;
      break;
    } catch (e: any) {
      console.log(`  ⚠️ Login failed for ${cred.email}: ${e.message.slice(0, 60)}`);
    }
  }

  if (!loggedIn) {
    console.error('❌ Could not login with any credential. Check dev servers.');
    process.exit(1);
  }

  console.log('\n--- TEST 1: Math Exam ("اختبار 3") ---');
  try {
    const { status, data } = await getExam(MATH_EXAM_ID, token!);
    console.log(`  Status: ${status}`);
    
    if (status === 200) {
      const questions = data.questions;
      if (!Array.isArray(questions)) {
        console.error(`  ❌ questions is not an array! Got: ${typeof questions}`, JSON.stringify(questions).slice(0, 200));
        process.exit(1);
      }
      console.log(`  ✅ questions is an array with ${questions.length} items`);
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const hasText = typeof q.text === 'string' && q.text.trim().length > 0;
        const hasOptions = Array.isArray(q.options) && q.options.length >= 2;
        const hasCorrect = typeof q.correctAnswer === 'number';
        
        console.log(`\n  Q${i+1}: ${hasText ? '✅' : '❌'} text present`);
        if (hasText) {
          // Check no double-escaped LaTeX
          const hasDoubleEscape = q.text.includes('\\\\(') || q.text.includes('\\\\[');
          console.log(`       text: "${q.text.slice(0, 80)}"`);
          console.log(`       double-escaped LaTeX: ${hasDoubleEscape ? '❌ YES — PROBLEM' : '✅ None'}`);
        }
        console.log(`       ${hasOptions ? '✅' : '❌'} options (${q.options?.length || 0})`);
        if (hasOptions) {
          q.options.slice(0, 2).forEach((o: string, oi: number) => console.log(`         [${oi}] ${o}`));
        }
        console.log(`       ${hasCorrect ? '✅' : '❌'} correctAnswer field present`);
        // For teacher view, correctAnswer should be present
        // For student view, it would be stripped
      }
    } else if (status === 500) {
      console.error('  ❌ API returned 500:', JSON.stringify(data));
    } else {
      console.warn('  ⚠️ Unexpected status:', status, JSON.stringify(data).slice(0, 200));
    }
  } catch (e: any) {
    console.error('  ❌ Request failed:', e.message);
  }

  // Also check one E2E Final Exam
  console.log('\n--- TEST 2: E2E Final Exam (legacy { create: [...] } format) ---');
  const E2E_EXAM_ID = 'bf18af55-cde4-4a24-8bd6-f09712daf3bc';
  try {
    const { status, data } = await getExam(E2E_EXAM_ID, token!);
    console.log(`  Status: ${status}`);
    if (status === 200) {
      const questions = data.questions;
      if (!Array.isArray(questions)) {
        console.error(`  ❌ questions is not an array! Got: ${typeof questions}`);
        process.exit(1);
      }
      console.log(`  ✅ questions is an array with ${questions.length} items`);
      if (questions.length > 0) {
        console.log(`  Q1 text: "${questions[0].text}"`);
        console.log(`  Q1 options: ${JSON.stringify(questions[0].options)}`);
      }
    } else {
      console.log(`  Status ${status}:`, JSON.stringify(data).slice(0, 200));
    }
  } catch (e: any) {
    console.error('  ❌ Request failed:', e.message);
  }

  console.log('\n========================================');
  console.log('  LIVE API VERIFICATION COMPLETE');
  console.log('========================================\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
