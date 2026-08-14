const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testCourseEdit() {
  console.log("=== TEST: COURSE EDIT ===");
  const results = {
    test: 'Course Edit',
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

    // Get any course
    const course = await prisma.course.findFirst({ 
      orderBy: { createdAt: 'desc' }
    });
    if (!course) throw new Error("No course found");
    results.dbBefore = course.title;
    const updatedTitle = `CourseAPITest ${Date.now()}`;

    // 1. API Check
    const resEdit = await axios.put(`http://localhost:5173/api/courses/${course.id}`, {
      title: updatedTitle,
      teacherId: course.teacherId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    results.apiResponseStatus = resEdit.status;

    // 2. DB Check
    const courseAfterApi = await prisma.course.findUnique({ where: { id: course.id } });
    results.dbAfter = courseAfterApi.title;
    const apiChainPassed = (results.apiResponseStatus === 200 && results.dbAfter === updatedTitle);
    results.evidence.push(`API: ${results.apiResponseStatus}, DB match: ${apiChainPassed}`);

    // Revert
    await prisma.course.update({ where: { id: course.id }, data: { title: course.title }});

    // 3. Puppeteer UI Check
    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'E2E_ADMIN_2026@test.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    await page.goto('http://localhost:5173/admin/courses', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    const bodyTxt = await page.evaluate(() => document.body.innerText);
    console.log("Page has course title:", bodyTxt.includes(course.title));
    console.log("Searching for:", course.title.substring(0, 30));

    // Courses page uses a card grid - find the card with the title and click تعديل button
    const clickResult = await page.evaluate((courseTitle) => {
      // Find all bg-white cards
      const cards = Array.from(document.querySelectorAll('div.bg-white.rounded-xl'));
      for (const card of cards) {
        const h3 = card.querySelector('h3');
        if (h3 && h3.innerText.includes(courseTitle)) {
          // Find the تعديل button (has span text 'تعديل')
          const btns = Array.from(card.querySelectorAll('button'));
          for (const btn of btns) {
            if (btn.innerText.includes('تعديل')) {
              btn.click();
              return { found: true, btnText: btn.innerText.trim() };
            }
          }
        }
      }
      return { found: false };
    }, course.title);

    console.log("Edit click result:", clickResult);

    if (!clickResult.found) {
      throw new Error(`Edit button not found for course "${course.title}"`);
    }

    await new Promise(r => setTimeout(r, 1500));

    const modalOpen = await page.evaluate(() => !!document.querySelector('.fixed.inset-0'));
    console.log("Modal opened:", modalOpen);
    if (!modalOpen) throw new Error('Modal did not open after clicking edit button');

    const updatedTitleForUI = `UICourseEdit ${Date.now()}`;

    // Type new title in the first text input of the modal
    const titleInput = await page.$('.fixed.inset-0 input[type="text"]');
    if (titleInput) {
      await titleInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await titleInput.type(updatedTitleForUI);
      console.log("Typed new title:", updatedTitleForUI);
    } else {
      throw new Error('Title input not found in modal');
    }

    // Click 'حفظ'
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

    // Revert DB
    await prisma.course.update({ where: { id: course.id }, data: { title: course.title }});

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

testCourseEdit();
