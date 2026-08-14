const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testHomeworkGrading() {
  console.log("=== TEST 6: HOMEWORK GRADING ===");
  const results = {
    test: 'Homework Grading',
    preconditions: 'Homework with questions, Student enrolled, Video watched',
    dbBefore: null,
    apiResponseStatus: null,
    dbAfter: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    // 1. Setup Homework and Student
    const student = await prisma.user.findFirst({
      where: { email: 'E2E_STUDENT_B_2026@test.com' }
    });
    let hw = await prisma.homework.findFirst({
      where: { title: 'Dependency Homework' }
    });
    
    // Update the homework with 2 questions
    hw = await prisma.homework.update({
      where: { id: hw.id },
      data: {
        questions: [
          { id: 1, text: '1+1=?', type: 'MCQ', options: ['1', '2', '3'], correct: '2' },
          { id: 2, text: '2+2=?', type: 'MCQ', options: ['3', '4', '5'], correct: '4' }
        ]
      }
    });

    // Ensure the video dependency is watched
    await prisma.videoProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId: hw.lessonId } },
      update: { watched: true, progress: 100 },
      create: { studentId: student.id, lessonId: hw.lessonId, watched: true, progress: 100 }
    });

    // Ensure previous submissions are deleted
    await prisma.submission.deleteMany({
      where: { homeworkId: hw.id, studentId: student.id }
    });

    results.dbBefore = await prisma.submission.count({
      where: { homeworkId: hw.id, studentId: student.id }
    });
    
    // 2. Login
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_B_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    const token = resAuth.data.token;
    
    // 3. API Submit Homework (1 correct, 1 wrong = 50%)
    try {
      const submitRes = await axios.post(`http://localhost:5173/api/homework/${hw.id}/submit`, {
        answers: [
          { questionId: 1, selectedOption: '2' }, // Correct
          { questionId: 2, selectedOption: '3' }  // Wrong
        ]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiResponseStatus = submitRes.status;
      console.log("Homework Submit API Success");
    } catch(e) {
      results.apiResponseStatus = e.response ? e.response.status : e.message;
      throw new Error("Submit failed: " + (e.response ? JSON.stringify(e.response.data) : e.message));
    }
    
    // 4. DB Verification
    results.dbAfter = await prisma.submission.findFirst({
      where: { homeworkId: hw.id, studentId: student.id }
    });
    console.log("Calculated Grade in DB:", results.dbAfter?.grade);

    // 5. Puppeteer UI Check
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
    
    console.log("Navigating to homework dashboard...");
    await page.goto(`http://localhost:5173/student/online/homework`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_homework_grading.html', await page.evaluate(() => document.body.innerHTML));
    
    results.uiResult = textContent.includes('50%') || textContent.includes('50');
    console.log("UI contains 50%?", results.uiResult);
    
    await browser.close();

    const dbSuccess = results.dbBefore === 0 && results.dbAfter && results.dbAfter.grade === 50;
    const apiSuccess = results.apiResponseStatus === 201 || results.apiResponseStatus === 200;
    
    results.status = (dbSuccess && apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!dbSuccess) results.evidence.push(`DB grade incorrect or missing (Expected 50, got ${results.dbAfter?.grade})`);
    
  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testHomeworkGrading();
