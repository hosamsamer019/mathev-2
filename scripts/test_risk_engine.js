const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testRiskEngine() {
  console.log("=== TEST 11: RISK ENGINE ===");
  const results = {
    test: 'Risk Engine',
    preconditions: 'Student fails an exam',
    apiResponseContainsStudent: false,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    const student = await prisma.user.findFirst({ where: { email: 'E2E_STUDENT_B_2026@test.com' } });
    const teacher = await prisma.user.findFirst({ where: { email: 'E2E_TEACHER_A_2026@test.com' } });
    
    // Find or create course
    let course = await prisma.course.findFirst({ where: { teacherId: teacher.id } });
    if (!course) {
      course = await prisma.course.create({ data: { title: 'Risk Course', teacherId: teacher.id, status: 'PUBLISHED', price: 0 } });
    }
    await prisma.courseEnrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id }
    });

    // Create Exam
    const exam = await prisma.exam.create({
      data: {
        title: 'Risk Trigger Exam',
        courseId: course.id,
        duration: 60
      }
    });

    // Directly insert a failed attempt in DB (score < 50)
    await prisma.examAttempt.create({
      data: {
        studentId: student.id,
        examId: exam.id,
        score: 20
      }
    });

    // Login as Teacher
    const resTeacherAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_TEACHER_A_2026@test.com',
      password: 'Password123!',
      role: 'TEACHER'
    });
    const teacherToken = resTeacherAuth.data.token;

    // API Check Risk Engine
    try {
      const resApi = await axios.get('http://localhost:5173/api/analytics/risk', {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      const riskStudents = resApi.data.riskStudents || [];
      results.apiResponseContainsStudent = riskStudents.some(s => s.id === student.id && s.riskScore >= 40);
      if (results.apiResponseContainsStudent) console.log("API returned student as at-risk correctly.");
    } catch(e) {
      console.log("Risk API error:", e.response ? e.response.data : e.message);
    }

    // Puppeteer Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/');
    await page.evaluate((t, tId) => {
      localStorage.setItem('token', t);
      localStorage.setItem('edu-user', JSON.stringify({ 
        id: tId,
        role: 'TEACHER',
        name: 'E2E Teacher'
      }));
    }, teacherToken, teacher.id);
    
    console.log("Navigating to teacher dashboard...");
    await page.goto(`http://localhost:5173/teacher`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_risk.html', await page.evaluate(() => document.body.innerHTML));
    
    // We check if student name appears in the UI
    results.uiResult = textContent.includes(student.name || 'E2E');
    
    await browser.close();

    const apiSuccess = results.apiResponseContainsStudent;

    results.status = (apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!apiSuccess) results.evidence.push("API did not return student in risk array.");

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    // cleanup
    await prisma.exam.deleteMany({ where: { title: 'Risk Trigger Exam' } });
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testRiskEngine();
