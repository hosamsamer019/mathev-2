const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testTeacherDashboard() {
  console.log("=== TEST 12: TEACHER DASHBOARD ===");
  const results = {
    test: 'Teacher Dashboard',
    preconditions: 'Teacher user exists',
    apiStatus: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    const teacher = await prisma.user.findFirst({ where: { email: 'E2E_TEACHER_A_2026@test.com' } });
    
    // Login as Teacher
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_TEACHER_A_2026@test.com',
      password: 'Password123!',
      role: 'TEACHER'
    });
    const token = resAuth.data.token;

    // API Check for teacher dashboard stats
    try {
      const resApi = await axios.get(`http://localhost:5173/api/analytics/teacher/${teacher.id}/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.apiStatus = resApi.status;
    } catch(e) {
      results.apiStatus = e.response ? e.response.status : e.message;
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
    }, token, teacher.id);
    
    console.log("Navigating to teacher dashboard...");
    await page.goto(`http://localhost:5173/teacher`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_teacher_dash.html', await page.evaluate(() => document.body.innerHTML));
    
    // Check for some teacher specific dashboard text
    results.uiResult = textContent.includes('E2E Teacher') || textContent.includes('لوحة تحكم المعلم') || textContent.includes('إحصائيات المنصة');
    
    await browser.close();

    const apiSuccess = results.apiStatus === 200;

    results.status = (apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!apiSuccess) results.evidence.push("API dashboard endpoint failed: " + results.apiStatus);

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testTeacherDashboard();
