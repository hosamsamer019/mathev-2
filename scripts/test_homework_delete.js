const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testHomeworkDelete() {
  console.log("=== TEST: HOMEWORK DELETE ===");
  const results = {
    test: 'Homework Delete',
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

    // Create temp homework directly via Prisma
    const existingHW = await prisma.homework.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!existingHW) throw new Error("No homework found to get courseId from");
    
    const tempHW = await prisma.homework.create({
      data: {
        title: `TEMP_DELETE_${Date.now()}`,
        courseId: existingHW.courseId
      }
    });
    results.dbBefore = 1; // created
    console.log("Created temp HW:", tempHW.id, tempHW.title);

    // 1. API Delete check
    const resDelete = await axios.delete(`http://localhost:5173/api/homework/${tempHW.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    results.apiResponseStatus = resDelete.status;

    // 2. DB Check
    const hwAfterDelete = await prisma.homework.findUnique({ where: { id: tempHW.id } });
    results.dbAfter = hwAfterDelete ? 1 : 0;
    const apiChainPassed = (results.apiResponseStatus === 200 && results.dbAfter === 0);

    // 3. Puppeteer UI Check - create another and delete via UI
    const tempHW2 = await prisma.homework.create({
      data: {
        title: `TEMP_UI_DELETE_${Date.now()}`,
        courseId: existingHW.courseId
      }
    });
    console.log("Created temp HW2 for UI:", tempHW2.id, tempHW2.title);

    console.log("Launching Puppeteer...");
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'E2E_ADMIN_2026@test.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    await page.goto('http://localhost:5173/admin/homework', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    const bodyTxt = await page.evaluate(() => document.body.innerText);
    console.log("Page has HW2 title:", bodyTxt.includes(tempHW2.title));

    // Override window.confirm to return true 
    await page.evaluate(() => { window.confirm = () => true; });

    // Click delete button for tempHW2
    const deleteBtnFound = await page.evaluate((hwTitle) => {
      const rows = document.querySelectorAll('tr');
      for (const row of rows) {
        if (row.innerText.includes(hwTitle)) {
          const btns = row.querySelectorAll('button[title="حذف"]');
          if (btns.length > 0) {
            btns[0].click();
            return true;
          }
          // fallback: click first red button
          const allBtns = row.querySelectorAll('button');
          for (const btn of allBtns) {
            if (btn.className.includes('red')) {
              btn.click();
              return true;
            }
          }
        }
      }
      return false;
    }, tempHW2.title);

    if (!deleteBtnFound) {
      // Cleanup before failing
      await prisma.homework.deleteMany({ where: { id: { in: [tempHW2.id] } } });
      throw new Error(`Delete button not found for homework "${tempHW2.title}"`);
    }

    await new Promise(r => setTimeout(r, 3000));
    
    const finalBody = await page.evaluate(() => document.body.innerText);
    results.uiResult = !finalBody.includes(tempHW2.title);

    // Verify DB-level deletion
    const uiDeleteCheck = await prisma.homework.findUnique({ where: { id: tempHW2.id } });
    const dbDeletedByUI = !uiDeleteCheck;
    
    await browser.close();

    if (apiChainPassed && results.uiResult && dbDeletedByUI) {
        results.status = 'PASSED';
    }
    results.evidence.push(`API delete: ${results.apiResponseStatus}, DB after: ${results.dbAfter}, UI deleted: ${results.uiResult}, DB UI deleted: ${dbDeletedByUI}`);
  } catch(e) {
    console.error("Error:", e.message);
    results.evidence.push(e.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log("RESULT:", results);
}

testHomeworkDelete();
