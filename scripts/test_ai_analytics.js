const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testAiAnalytics() {
  console.log("=== TEST 13: AI ANALYTICS ===");
  const results = {
    test: 'AI Analytics',
    preconditions: 'Student interacts with AI, Teacher views stats',
    apiStatus: null,
    apiResponseData: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    const student = await prisma.user.findFirst({ where: { email: 'E2E_STUDENT_B_2026@test.com' } });
    const teacher = await prisma.user.findFirst({ where: { email: 'E2E_TEACHER_A_2026@test.com' } });
    
    // Create Chat Session
    const session = await prisma.chatSession.create({
      data: {
        userId: student.id,
        messages: {
          create: [
            { content: 'Hello AI', role: 'user' },
            { content: 'Hello Student', role: 'assistant' }
          ]
        }
      }
    });

    // Login as Teacher
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_TEACHER_A_2026@test.com',
      password: 'Password123!',
      role: 'TEACHER'
    });
    const token = resAuth.data.token;

    // API Check
    try {
      const resApi = await axios.get('http://localhost:5173/api/analytics/ai-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiStatus = resApi.status;
      results.apiResponseData = resApi.data;
    } catch(e) {
      results.apiStatus = e.response ? e.response.status : e.message;
    }

    // Puppeteer UI Check
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
    }, token, teacher.id);
    
    console.log("Navigating to teacher AI dashboard...");
    await page.goto(`http://localhost:5173/teacher/ai`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_ai_analytics.html', await page.evaluate(() => document.body.innerHTML));
    
    // Should show "Hello AI" or the student name since it's a recent session
    results.uiResult = textContent.includes('Hello AI') || textContent.includes(student.name || 'E2E');
    
    await browser.close();

    const apiSuccess = results.apiStatus === 200 && results.apiResponseData && results.apiResponseData.totalMessages >= 2;

    results.status = (apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!apiSuccess) results.evidence.push("API failed or missing data: " + results.apiStatus);

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    await prisma.chatMessage.deleteMany({ where: { content: { in: ['Hello AI', 'Hello Student'] } } });
    await prisma.chatSession.deleteMany({ where: { messages: { none: {} } } }); // cleanup empty
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testAiAnalytics();
