const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const { getBrowser } = require('./e2e_utils');
const path = require('path');

const prisma = new PrismaClient();

async function testExamEdit() {
  console.log("=== TEST: EXAM EDIT ===");
  const results = {
    test: 'Exam Edit',
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

    // Get an exam
    const exam = await prisma.exam.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!exam) throw new Error("No test exam found");
    results.dbBefore = exam.title;
    const updatedTitle = `ExamAPITest ${Date.now()}`;

    // 1. API Check
    const resEdit = await axios.put(`http://localhost:5173/api/exams/${exam.id}`, {
      title: updatedTitle,
      courseId: exam.courseId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    results.apiResponseStatus = resEdit.status;

    // 2. DB Check
    const examAfterApi = await prisma.exam.findUnique({ where: { id: exam.id } });
    results.dbAfter = examAfterApi.title;
    const apiChainPassed = (results.apiResponseStatus === 200 && results.dbAfter === updatedTitle);
    results.evidence.push(`API: ${results.apiResponseStatus}, DB match: ${apiChainPassed}`);

    // Revert
    await prisma.exam.update({ where: { id: exam.id }, data: { title: exam.title }});

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
    
    await page.goto('http://localhost:5173/admin/exams', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));
    
    const bodyTxt = await page.evaluate(() => document.body.innerText);
    console.log("Page contains exam title:", bodyTxt.includes(exam.title));

    // Click the edit button for this exam using page.evaluate to find and click
    const clickResult = await page.evaluate((examTitle) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        if (row.innerText && row.innerText.includes(examTitle)) {
          // Click the blue edit button (title="تعديل الامتحان" or first blue btn)
          const btn = row.querySelector('button[title="تعديل الامتحان"]') 
                   || row.querySelector('button.text-blue-600')
                   || row.querySelector('button:not(.text-red-600)');
          if (btn) {
            btn.click();
            return { found: true, btnTitle: btn.title, btnClass: btn.className };
          }
        }
      }
      return { found: false };
    }, exam.title);

    console.log("Edit button click result:", clickResult);

    if (!clickResult.found) {
      throw new Error(`Edit button not found for exam "${exam.title}"`);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Check if modal opened
    const modalOpen = await page.evaluate(() => !!document.querySelector('.fixed.inset-0'));
    console.log("Modal opened:", modalOpen);
    
    if (!modalOpen) {
      throw new Error('Modal did not open after clicking edit button');
    }

    const updatedTitleForUI = `UIExamEdit ${Date.now()}`;
    
    // Use puppeteer to clear and type in first text input (title field)
    const titleInput = await page.$('.fixed.inset-0 input[type="text"]');
    if (titleInput) {
      // Select all and clear
      await titleInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      // Type new title character by character to trigger React onChange
      await titleInput.type(updatedTitleForUI);
      console.log("Typed new title:", updatedTitleForUI);
    } else {
      throw new Error('Title input not found in modal');
    }
    
    // Click the save button (حفظ)
    const saved = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
      for (const btn of btns) {
        if (btn.innerText.includes('حفظ')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    console.log("Save button clicked:", saved);

    await new Promise(r => setTimeout(r, 4000)); // wait for save and reload
    
    const finalBody = await page.evaluate(() => document.body.innerText);
    results.uiResult = finalBody.includes(updatedTitleForUI);
    results.evidence.push(`UI result: ${results.uiResult}`);
    
    // Revert
    await prisma.exam.update({ where: { id: exam.id }, data: { title: exam.title }});
    
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

testExamEdit();
