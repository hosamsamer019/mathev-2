const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testVideoProgress() {
  console.log("=== TEST 4: VIDEO PROGRESS ===");
  const results = {
    test: 'Video Progress',
    preconditions: 'E2E Student B user and Lesson exist',
    dbBefore: null,
    apiResponseStatus: null,
    dbAfter: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    // 1. Get user and lesson
    const student = await prisma.user.findFirst({
      where: { email: 'E2E_STUDENT_B_2026@test.com' }
    });
    const lesson = await prisma.lesson.findFirst({
      where: { videoUrl: { not: null } }
    });

    if (!lesson) throw new Error("No lesson found with videoUrl");
    
    // Clear any existing progress
    await prisma.videoProgress.deleteMany({
      where: { lessonId: lesson.id, studentId: student.id }
    });
    
    results.dbBefore = await prisma.videoProgress.findFirst({
      where: { lessonId: lesson.id, studentId: student.id }
    });
    console.log("DB Before:", results.dbBefore);

    // 2. Login
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_B_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    const token = resAuth.data.token;
    
    // 3. Post to Progress Endpoint
    try {
      const resProg = await axios.post(`http://localhost:5173/api/courses/lessons/${lesson.id}/progress`, {
        progress: 75,
        watched: false,
        lastTimestamp: 75
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiResponseStatus = resProg.status;
      console.log("API Status:", results.apiResponseStatus);
    } catch(e) {
      results.apiResponseStatus = e.response ? e.response.status : e.message;
      results.evidence.push("API error: " + (e.response ? JSON.stringify(e.response.data) : e.message));
    }
    
    // 4. Check DB After
    results.dbAfter = await prisma.videoProgress.findFirst({
      where: { lessonId: lesson.id, studentId: student.id }
    });
    console.log("DB After:", results.dbAfter);

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
    
    console.log("Navigating to video player page...");
    await page.goto(`http://localhost:5173/student/online/videos/${lesson.id}`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_video_progress.html', await page.evaluate(() => document.body.innerHTML));
    await page.screenshot({ path: 'debug_video_progress.png' });
    
    // We consider UI successful if the page loads without throwing an error 
    // and contains the lesson title (meaning it successfully fetched the lesson and progress data)
    results.uiResult = textContent.includes(lesson.title);
    
    await browser.close();

    const dbSuccess = results.dbBefore === null && results.dbAfter && results.dbAfter.progress === 75;
    const apiSuccess = results.apiResponseStatus === 200 || results.apiResponseStatus === 201;

    results.status = (dbSuccess && apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!dbSuccess) results.evidence.push("DB state mismatch");
    if (!apiSuccess) results.evidence.push("API status mismatch");
    if (!results.uiResult) results.evidence.push("UI text missing lesson title");

  } catch(e) {
    const msg = e.response ? JSON.stringify(e.response.data) : e.message;
    console.error("Error:", msg);
    results.evidence.push(msg);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testVideoProgress();
