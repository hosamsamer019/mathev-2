const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testReports() {
  console.log("=== TEST 14: REPORTS ===");
  const results = {
    test: 'Reports',
    preconditions: 'Student has activity, Teacher generates report',
    apiStatus: null,
    apiResponseData: null,
    uiResult: false,
    status: 'FAILED',
    evidence: []
  };

  try {
    const student = await prisma.user.findFirst({ where: { email: 'E2E_STUDENT_B_2026@test.com' } });
    
    // Login as Teacher
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_TEACHER_A_2026@test.com',
      password: 'Password123!',
      role: 'TEACHER'
    });
    const token = resAuth.data.token;

    // API Check
    try {
      const resApi = await axios.get(`http://localhost:5173/api/analytics/report/${student.id}`, {
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
    }, token, 'teacher-id'); // id is mostly ignored in this UI check
    
    console.log("Navigating to student report page...");
    await page.goto(`http://localhost:5173/teacher/students/${student.id}`, { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const textContent = await page.evaluate(() => document.body.innerText);
    require('fs').writeFileSync('debug_reports.html', await page.evaluate(() => document.body.innerHTML));
    
    // UI check: Should display student name or report info
    results.uiResult = textContent.includes(student.name || 'E2E');
    
    await browser.close();

    const apiSuccess = results.apiStatus === 200 && results.apiResponseData;

    results.status = (apiSuccess && results.uiResult) ? 'PASSED' : 'FAILED';
    if (!apiSuccess) results.evidence.push("API failed or missing data: " + results.apiStatus);

  } catch(e) {
    console.error("Error:", e);
    results.evidence.push(e.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testReports();
