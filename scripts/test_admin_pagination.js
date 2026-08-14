const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testAdminPagination() {
  console.log("=== TEST: ADMIN PAGINATION ===");
  const results = {
    test: 'Admin Pagination',
    apiResponseStatus: null,
    apiResponseData: null,
    uiResult: null,
    status: 'FAILED',
    evidence: []
  };

  try {
    const resAuth = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'E2E_ADMIN_2026@test.com',
      password: 'Password123!',
      role: 'ADMIN'
    });
    const token = resAuth.data.token;
    
    // 1. API Check for page 2
    const resPage2 = await axios.get('http://localhost:5173/api/users/users?page=2&limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    results.apiResponseStatus = resPage2.status;
    results.apiResponseData = resPage2.data;

    if (!resPage2.data || !Array.isArray(resPage2.data.data)) {
        throw new Error('API returned invalid pagination response');
    }

    // 2. Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'E2E_ADMIN_2026@test.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Navigate to students page
    await page.goto('http://localhost:5173/admin/students', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Click Next page button
    const buttons = await page.$$('button');
    let nextBtn = null;
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes('التالي')) {
            nextBtn = btn;
            break;
        }
    }

    if (nextBtn) {
        // Intercept network requests to verify frontend sends page parameter
        let sentPageParam = false;
        page.on('request', request => {
            if (request.url().includes('/api/users') && request.url().includes('page=')) {
                sentPageParam = true;
            }
        });
        
        await nextBtn.click();
        await new Promise(r => setTimeout(r, 2000)); // wait for api
        results.uiResult = sentPageParam;
    } else {
        throw new Error('Next button not found');
    }
    
    await browser.close();

    if (results.apiResponseStatus === 200 && results.uiResult) {
        results.status = 'PASSED';
    }
  } catch(e) {
    console.error("Error:", e.message);
    results.evidence.push(e.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testAdminPagination();
