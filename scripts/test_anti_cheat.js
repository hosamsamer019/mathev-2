const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testAntiCheat() {
  console.log("=== TEST 9: ANTI-CHEAT ===");
  const results = {
    test: 'Anti-Cheat',
    preconditions: 'Student starts exam attempt',
    apiFirstViolationStatus: null,
    apiSecondViolationStatus: null,
    dbViolationsCount: 0,
    dbAttemptScore: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    const student = await prisma.user.findFirst({ where: { email: 'E2E_STUDENT_B_2026@test.com' } });
    const teacher = await prisma.user.findFirst({ where: { email: 'E2E_TEACHER_A_2026@test.com' } });
    
    // Find or create a course
    let course = await prisma.course.findFirst({ where: { teacherId: teacher.id } });
    if (!course) {
      course = await prisma.course.create({ data: { title: 'Anti-Cheat Course', teacherId: teacher.id, status: 'PUBLISHED', price: 0 } });
    }
    
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id }
    });

    const pastDate = new Date(Date.now() - 1000 * 60 * 60);
    const exam = await prisma.exam.create({
      data: {
        title: 'Cheat Test Exam',
        courseId: course.id,
        startTime: pastDate,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
        questions: [{ id: 1, text: 'Q1', type: 'MCQ', options: ['A','B'], correct: 'A' }],
        duration: 60
      }
    });

    // Login
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_B_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    const token = resAuth.data.token;
    
    // 1. Start Attempt
    await axios.post(`http://localhost:5173/api/exams/${exam.id}/start`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Trigger Violation 1
    const resV1 = await axios.post(`http://localhost:5173/api/exams/${exam.id}/violation`, { type: 'BLUR' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    results.apiFirstViolationStatus = resV1.status;

    // 3. Trigger Violation 2 (Should Disqualify)
    try {
      const resV2 = await axios.post(`http://localhost:5173/api/exams/${exam.id}/violation`, { type: 'BLUR' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiSecondViolationStatus = resV2.status;
    } catch(e) {
      results.apiSecondViolationStatus = e.response ? e.response.status : e.message;
    }

    // DB Checks
    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: student.id },
      include: { violations: true }
    });

    results.dbViolationsCount = attempt?.violations.length;
    results.dbAttemptScore = attempt?.score;

    // Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Login as Teacher to see if UI renders fine
    await page.goto('http://localhost:5173/');
    
    const resTeacherAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_TEACHER_A_2026@test.com',
      password: 'Password123!',
      role: 'TEACHER'
    });
    
    await page.evaluate((t, tId) => {
      localStorage.setItem('token', t);
      localStorage.setItem('edu-user', JSON.stringify({ 
        id: tId,
        role: 'TEACHER',
        name: 'E2E Teacher'
      }));
    }, resTeacherAuth.data.token, teacher.id);
    
    console.log("Navigating to teacher dashboard...");
    await page.goto(`http://localhost:5173/teacher`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_anti_cheat.html', await page.evaluate(() => document.body.innerHTML));
    
    results.uiResult = textContent.includes('E2E Teacher') || textContent.includes('لوحة تحكم المعلم');
    
    await browser.close();

    const dbSuccess = results.dbViolationsCount >= 1 && results.dbAttemptScore === 0;
    const apiSuccess = results.apiFirstViolationStatus === 200 && results.apiSecondViolationStatus === 403;

    results.status = (dbSuccess && apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!dbSuccess) results.evidence.push("DB logic failed. Violations: " + results.dbViolationsCount + ", Score: " + results.dbAttemptScore);
    if (!apiSuccess) results.evidence.push("API status mismatch. V1: " + results.apiFirstViolationStatus + ", V2: " + results.apiSecondViolationStatus);

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    // cleanup
    await prisma.exam.deleteMany({ where: { title: 'Cheat Test Exam' } });
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testAntiCheat();
