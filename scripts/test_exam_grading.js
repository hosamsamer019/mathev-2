const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testExamGrading() {
  console.log("=== TEST 8: EXAM GRADING ===");
  const results = {
    test: 'Exam Grading',
    preconditions: 'Exam with 4 questions',
    apiResponseStatus: null,
    dbGrade: null,
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
      course = await prisma.course.create({ data: { title: 'Exam Grading Course', teacherId: teacher.id, status: 'PUBLISHED', price: 0 } });
    }
    
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id }
    });

    const questions = [
      { id: 1, text: 'Q1', type: 'MCQ', options: ['A','B'], correct: 'A' },
      { id: 2, text: 'Q2', type: 'MCQ', options: ['A','B'], correct: 'B' },
      { id: 3, text: 'Q3', type: 'MCQ', options: ['A','B'], correct: 'A' },
      { id: 4, text: 'Q4', type: 'MCQ', options: ['A','B'], correct: 'B' }
    ];

    const pastDate = new Date(Date.now() - 1000 * 60 * 60); // -1 hour
    const exam = await prisma.exam.create({
      data: {
        title: 'Grading Exam',
        courseId: course.id,
        startTime: pastDate,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 2),
        questions,
        duration: 60,
        randomization: false
      }
    });

    // Login
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_B_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    const token = resAuth.data.token;
    
    // Test: Submit Exam with 2 correct and 2 wrong answers -> score 50
    try {
      const resSubmit = await axios.post(`http://localhost:5173/api/exams/${exam.id}/submit`, {
        answers: [
          { questionId: 1, selectedOption: 'A' }, // Correct
          { questionId: 2, selectedOption: 'B' }, // Correct
          { questionId: 3, selectedOption: 'B' }, // Wrong
          { questionId: 4, selectedOption: 'A' }  // Wrong
        ]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiResponseStatus = resSubmit.status;
    } catch(e) {
      results.apiResponseStatus = e.response ? e.response.status : e.message;
      throw new Error("Exam submission failed: " + (e.response ? JSON.stringify(e.response.data) : e.message));
    }

    const attempt = await prisma.examAttempt.findFirst({
      where: { examId: exam.id, studentId: student.id }
    });
    results.dbGrade = attempt?.score;

    // Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/');
    await page.evaluate((t, sId) => {
      localStorage.setItem('token', t);
      localStorage.setItem('edu-user', JSON.stringify({ 
        id: sId,
        role: 'ONLINE_STUDENT',
        name: 'E2E Student'
      }));
    }, token, student.id);
    
    console.log("Navigating to exams dashboard...");
    await page.goto(`http://localhost:5173/student/online/exams`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_exam_grading.html', await page.evaluate(() => document.body.innerHTML));
    
    results.uiResult = textContent.includes('50%') || textContent.includes('50');
    console.log("UI lists score 50?", results.uiResult);
    
    await browser.close();

    const dbSuccess = results.dbGrade === 50;
    const apiSuccess = results.apiResponseStatus === 200 || results.apiResponseStatus === 201;

    results.status = (dbSuccess && apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!dbSuccess) results.evidence.push("DB grade mismatch! Expected 50, got: " + results.dbGrade);
    if (!apiSuccess) results.evidence.push("API failed! Status: " + results.apiResponseStatus);

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    // cleanup
    await prisma.exam.deleteMany({ where: { title: 'Grading Exam' } });
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testExamGrading();
