const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testRoleIsolation() {
  console.log("=== TEST 2: ROLE ISOLATION ===");
  const results = {
    test: 'Role Isolation',
    preconditions: 'E2E Student A user exists',
    apiResponseStatus: null,
    uiResult: null,
    status: 'FAILED',
    evidence: []
  };

  try {
    // 1. Login to API as Student
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_STUDENT_A_2026@test.com',
      password: 'Password123!',
      role: 'ONLINE_STUDENT'
    });
    
    const token = resAuth.data.token;
    
    // 2. Request API (Teacher Endpoint)
    try {
      const resTeacherApi = await axios.post('http://localhost:5173/api/courses', {
        title: 'Hacked Course',
        description: 'Should not work'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.evidence.push("API allowed student to create course!");
    } catch(err) {
      results.apiResponseStatus = err.response ? err.response.status : err.message;
      console.log("API responded with:", results.apiResponseStatus);
    }
    
    // 3. Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // We will bypass the role selection UI by injecting the token directly
    await page.goto('http://localhost:5173/');
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify({ role: 'ONLINE_STUDENT' }));
    }, token);
    
    console.log("Attempting to access /teacher...");
    await page.goto('http://localhost:5173/teacher', { waitUntil: 'networkidle0' });
    
    // Check if redirected or showing access denied
    const url = page.url();
    const textContent = await page.evaluate(() => document.body.innerText);
    
    results.uiResult = {
      redirectedToLogin: url.includes('/login') || url.includes('/student'),
      showsDenied: textContent.includes('صلاحية') || textContent.includes('Denied') || textContent.includes('غير مصرح')
    };
    console.log("UI isolation result:", results.uiResult, "URL:", url);
    
    await browser.close();

    // Verification logic
    const apiIsolated = results.apiResponseStatus === 401 || results.apiResponseStatus === 403;
    const uiIsolated = results.uiResult.redirectedToLogin || results.uiResult.showsDenied;
    
    results.status = (apiIsolated && uiIsolated) ? 'PASSED' : 'FAILED';
  } catch(e) {
    const msg = e.response ? JSON.stringify(e.response.data) : e.message;
    console.error("Error:", msg);
    results.evidence.push(msg);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testRoleIsolation();
