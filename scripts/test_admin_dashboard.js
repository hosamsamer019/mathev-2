const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');
const fs = require('fs');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api'; // Or auth port. Let's check package.json for ports.

async function testAdminDashboard() {
  console.log("=== TEST 1: ADMIN DASHBOARD ===");
  const results = {
    test: 'Admin Dashboard',
    preconditions: 'E2E Admin user exists',
    dbBefore: {},
    apiResponse: null,
    uiResult: null,
    status: 'FAILED',
    evidence: []
  };

  try {
    // 1. Check DB state
    const studentCount = await prisma.user.count({ where: { role: { in: ['ONLINE_STUDENT', 'CENTER_STUDENT'] } } });
    const teacherCount = await prisma.user.count({ where: { role: 'TEACHER' } });
    const courseCount = await prisma.course.count();
    
    results.dbBefore = { studentCount, teacherCount, courseCount };
    console.log("DB State:", results.dbBefore);

    // 2. Login to API
    // Which port is auth-service? Often it's 3001 or 3000. Let's try 3000. Wait, in Microservices it's routed through API Gateway or Nginx?
    // Let's assume the frontend hits an API on localhost:3000 or the vite proxy routes /api to the services.
    // The vite proxy is usually on 5173.
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_ADMIN_2026@test.com',
      password: 'Password123!',
      role: 'ADMIN'
    });
    
    const token = resAuth.data.token;
    
    // 3. Request API
    const resOverview = await axios.get('http://localhost:5173/api/analytics/admin', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    results.apiResponse = resOverview.data;
    console.log("API Response:", results.apiResponse);
    
    // 4. Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Set token in localStorage
    console.log("Navigating to login...");
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    
    console.log("Typing credentials...");
    await page.type('input[type="email"]', 'E2E_ADMIN_2026@test.com');
    await page.type('input[type="password"]', 'Password123!');
    
    console.log("Clicking login...");
    await page.click('button[type="submit"]');
    
    console.log("Waiting for navigation to admin dashboard...");
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log("Waiting for h1...");
    await page.waitForSelector('h1', { timeout: 10000 }); // Wait for page load
    
    console.log("Waiting for data to load (spinner to disappear)...");
    // Wait until "جاري تحميل" is no longer in the DOM, or wait for the stats grid
    await page.waitForFunction(
      'document.body.innerText.includes("إجمالي المستخدمين")',
      { timeout: 15000 }
    );
    
    // Scrape values from UI
    console.log("Extracting text...");
    await new Promise(r => setTimeout(r, 2000)); // Give it a little time to finish rendering components after networkidle
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('debug_ui.html', html);
    await page.screenshot({ path: 'debug_admin.png' });
    
    const textContent = await page.evaluate(() => document.body.innerText);
    results.uiResult = textContent.includes(studentCount.toString()); // Basic check
    console.log("UI text includes student count?", results.uiResult);
    
    await browser.close();

    results.status = (studentCount === results.apiResponse.overview.studentsCount && results.uiResult) ? 'PASSED' : 'FAILED';
  } catch(e) {
    const msg = e.response ? JSON.stringify(e.response.data) : e.message;
    console.error("Error:", msg);
    results.evidence.push(msg);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testAdminDashboard();
