const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testHomeworkEdit() {
  console.log("=== TEST: HOMEWORK EDIT ===");
  const results = {
    test: 'Homework Edit',
    dbBefore: null,
    apiResponseStatus: null,
    dbAfter: null,
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

    // Get a homework
    const homework = await prisma.homework.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!homework) throw new Error("No homework found");
    results.dbBefore = homework.title;
    const updatedTitle = `HWAPITest ${Date.now()}`;

    // 1. API Check
    const resEdit = await axios.put(`http://localhost:5173/api/homework/${homework.id}`, {
      title: updatedTitle,
      courseId: homework.courseId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    results.apiResponseStatus = resEdit.status;

    // 2. DB Check
    const hwAfterApi = await prisma.homework.findUnique({ where: { id: homework.id } });
    results.dbAfter = hwAfterApi.title;
    const apiChainPassed = (results.apiResponseStatus === 200 && results.dbAfter === updatedTitle);
    results.evidence.push(`API: ${results.apiResponseStatus}, DB match: ${apiChainPassed}`);

    // Revert
    await prisma.homework.update({ where: { id: homework.id }, data: { title: homework.title }});

    // 3. Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'E2E_ADMIN_2026@test.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    await page.goto('http://localhost:5173/admin/homework', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    const bodyTxt = await page.evaluate(() => document.body.innerText);
    console.log("Page has hw title:", bodyTxt.includes(homework.title));
    console.log("Searching for:", homework.title.substring(0, 30));

    // Click the edit button (title="تعديل") in the row containing homework.title
    const clickResult = await page.evaluate((hwTitle) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        if (row.innerText && row.innerText.includes(hwTitle)) {
          const btn = row.querySelector('button[title="تعديل"]')
                   || row.querySelector('button.text-blue-600');
          if (btn) {
            btn.click();
            return { found: true, title: btn.title };
          }
        }
      }
      return { found: false };
    }, homework.title);

    console.log("Edit click result:", clickResult);

    if (!clickResult.found) {
      throw new Error(`Edit button not found for homework "${homework.title}"`);
    }

    await new Promise(r => setTimeout(r, 1500));
    
    const modalOpen = await page.evaluate(() => !!document.querySelector('.fixed.inset-0'));
    console.log("Modal opened:", modalOpen);
    if (!modalOpen) throw new Error('Modal did not open');

    const updatedTitleForUI = `UIHWEdit ${Date.now()}`;
    const titleInput = await page.$('.fixed.inset-0 input[type="text"]');
    if (titleInput) {
      await titleInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await titleInput.type(updatedTitleForUI);
      console.log("Typed new title:", updatedTitleForUI);
    } else {
      throw new Error('Title input not found in modal');
    }

    // Click save
    const saved = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
      for (const btn of btns) {
        if (btn.innerText.trim() === 'حفظ') {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log("Save clicked:", saved);

    await new Promise(r => setTimeout(r, 4000));
    
    const finalBody = await page.evaluate(() => document.body.innerText);
    results.uiResult = finalBody.includes(updatedTitleForUI);
    results.evidence.push(`UI result: ${results.uiResult}`);
    
    // Revert
    await prisma.homework.update({ where: { id: homework.id }, data: { title: homework.title }});
    
    await browser.close();

    if (apiChainPassed && results.uiResult) {
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

testHomeworkEdit();
