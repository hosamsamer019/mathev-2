const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testCourseEnrollment() {
  console.log("=== TEST 3: COURSE ENROLLMENT ===");
  const results = {
    test: 'Course Enrollment',
    preconditions: 'E2E Student B user and PUBLISHED course exist',
    dbBefore: null,
    apiResponseStatus: null,
    dbAfter: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    // 1. Find a published course and cleanup any existing enrollment
    const course = await prisma.course.findFirst({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true }
    });
    
    if (!course) throw new Error("No PUBLISHED course found in DB.");
    
    const student = await prisma.user.findFirst({
      where: { email: 'E2E_STUDENT_B_2026@test.com' }
    });

    await prisma.courseEnrollment.deleteMany({
      where: { courseId: course.id, studentId: student.id }
    });
    
    results.dbBefore = await prisma.courseEnrollment.count({
      where: { courseId: course.id, studentId: student.id }
    });
    console.log("Enrollment DB Before:", results.dbBefore);

    // 2. Login to API as Student B
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_B_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    const token = resAuth.data.token;
    
    // 3. Request API to enroll
    try {
      const enrollRes = await axios.post(`http://localhost:5173/api/courses/${course.id}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiResponseStatus = enrollRes.status;
      console.log("Enrollment API Status:", results.apiResponseStatus);
    } catch (e) {
      const msg = e.response ? JSON.stringify(e.response.data) : e.message;
      throw new Error(`Enrollment API failed: ${msg}`);
    }

    // 4. Verify DB state after
    results.dbAfter = await prisma.courseEnrollment.count({
      where: { courseId: course.id, studentId: student.id }
    });
    console.log("Enrollment DB After:", results.dbAfter);
    
    // 5. Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Bypass UI login steps and inject localStorage
    await page.goto('http://localhost:5173/');
    await page.evaluate((t, sId) => {
      localStorage.setItem('token', t);
      localStorage.setItem('edu-user', JSON.stringify({ 
        id: sId,
        role: 'ONLINE_STUDENT',
        name: 'E2E Student'
      }));
    }, token, student.id);
    
    console.log("Navigating to student courses dashboard...");
    await page.goto('http://localhost:5173/student/online/courses', { waitUntil: 'networkidle0' });
    
    console.log("Waiting for rendering...");
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    const htmlContent = await page.evaluate(() => document.body.innerHTML);
    require('fs').writeFileSync('debug_course.html', htmlContent);
    // Check if the course title exists in the DOM
    results.uiResult = textContent.includes(course.title);
    console.log(`UI text includes course title '${course.title}'?`, results.uiResult);
    
    if (!results.uiResult) {
      console.log("Wait, maybe the UI limits string length or shows a different title? Let's take a screenshot.");
      await page.screenshot({ path: 'debug_course.png' });
    }
    
    await browser.close();

    // Verification logic
    const dbSuccess = results.dbBefore === 0 && results.dbAfter === 1;
    const apiSuccess = results.apiResponseStatus === 201 || results.apiResponseStatus === 200;
    
    results.status = (dbSuccess && apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!dbSuccess) results.evidence.push("DB state mismatch");
    if (!apiSuccess) results.evidence.push("API status mismatch");
    if (!results.uiResult) results.evidence.push("Course not found in UI");

  } catch(e) {
    const msg = e.response ? JSON.stringify(e.response.data) : e.message;
    console.error("Error:", msg);
    results.evidence.push(msg);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testCourseEnrollment();
