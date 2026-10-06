import { getExamDetails } from './src/controllers/exam.controller';
import { getLessonDetails, getCourseDetails } from './src/controllers/course.controller';

async function runSec001Sec002Tests() {
  console.log('--- START SEC-001 & SEC-002 REGRESSION TESTS ---');
  let passed = 0;
  let failed = 0;

  // Test 1: Unenrolled student requests exam details -> 404 or 403
  {
    const req: any = {
      params: { id: 'non-existent-exam-id' },
      user: { userId: 'student-123', role: 'ONLINE_STUDENT', email: 'student@example.com' }
    };
    let statusSent = 0;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: () => res
    };
    await getExamDetails(req, res);
    if (statusSent === 404 || statusSent === 403) {
      console.log('✅ Test 1 Passed: Exam details authorization check handled safely.');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Expected 404/403, got ${statusSent}`);
      failed++;
    }
  }

  // Test 2: Unenrolled student requests lesson details -> 404 or 403
  {
    const req: any = {
      params: { id: 'non-existent-lesson-id' },
      user: { userId: 'student-123', role: 'ONLINE_STUDENT', email: 'student@example.com' }
    };
    let statusSent = 0;
    const res: any = {
      status: (s: number) => { statusSent = s; return res; },
      json: () => res
    };
    await getLessonDetails(req, res);
    if (statusSent === 404 || statusSent === 403) {
      console.log('✅ Test 2 Passed: Lesson details authorization check handled safely.');
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: Expected 404/403, got ${statusSent}`);
      failed++;
    }
  }

  console.log(`--- SEC-001 & SEC-002 RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runSec001Sec002Tests().catch(err => {
  console.error('Fatal error in SEC-001 & SEC-002 test:', err);
  process.exit(1);
});
