const { PrismaClient } = require('@smartmath/database');
const axios = require('axios');
const { getBrowser } = require('./e2e_utils');

const prisma = new PrismaClient();

async function testQuestionManagement() {
  console.log("=== TEST: QUESTION MANAGEMENT ===");
  const results = {
    test: 'Question Management',
    addResult: false,
    editResult: false,
    deleteResult: false,
    reloadResult: false,
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
    console.log("Testing with exam:", exam.title);

    // Get initial question count from DB
    const examInitial = await prisma.exam.findUnique({ where: { id: exam.id } });
    const initialQuestions = examInitial.questions 
      ? (typeof examInitial.questions === 'string' ? JSON.parse(examInitial.questions) : examInitial.questions) 
      : [];
    const initialCount = Array.isArray(initialQuestions) ? initialQuestions.length : 0;
    results.evidence.push(`Initial questions: ${initialCount}`);

    // 1. ADD Question via API directly
    const newQuestion = {
      id: `e2e_q_${Date.now()}`,
      text: 'E2E Test Question',
      type: 'multiple_choice',
      options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
      correct: 'Opt A'
    };
    const addedQuestions = [...initialQuestions, newQuestion];
    const resAdd = await axios.put(`http://localhost:5173/api/exams/${exam.id}`, {
      title: exam.title,
      courseId: exam.courseId,
      questions: addedQuestions
    }, { headers: { Authorization: `Bearer ${token}` } });

    if (resAdd.status === 200) {
      const examAfterAdd = await prisma.exam.findUnique({ where: { id: exam.id } });
      const afterAddQ = typeof examAfterAdd.questions === 'string' 
        ? JSON.parse(examAfterAdd.questions) 
        : examAfterAdd.questions;
      if (afterAddQ && Array.isArray(afterAddQ) && afterAddQ.length === initialCount + 1) {
        results.addResult = true;
      }
      results.evidence.push(`Add: questions count ${afterAddQ ? afterAddQ.length : 'null'}`);
    }

    // 2. EDIT Question via API
    const editedQuestions = addedQuestions.map(q => 
      q.id === newQuestion.id ? { ...q, text: 'E2E Edited Question' } : q
    );
    const resEdit = await axios.put(`http://localhost:5173/api/exams/${exam.id}`, {
      title: exam.title,
      courseId: exam.courseId,
      questions: editedQuestions
    }, { headers: { Authorization: `Bearer ${token}` } });

    if (resEdit.status === 200) {
      const examAfterEdit = await prisma.exam.findUnique({ where: { id: exam.id } });
      const afterEditQ = typeof examAfterEdit.questions === 'string' 
        ? JSON.parse(examAfterEdit.questions) 
        : examAfterEdit.questions;
      if (afterEditQ && Array.isArray(afterEditQ) && afterEditQ.some(q => q.text === 'E2E Edited Question')) {
        results.editResult = true;
      }
      results.evidence.push(`Edit: found edited question: ${results.editResult}`);
    }

    // 3. RELOAD Check - verify DB still has the edit
    const examAfterReload = await prisma.exam.findUnique({ where: { id: exam.id } });
    const afterReloadQ = typeof examAfterReload.questions === 'string' 
      ? JSON.parse(examAfterReload.questions) 
      : examAfterReload.questions;
    results.reloadResult = afterReloadQ && Array.isArray(afterReloadQ) && afterReloadQ.some(q => q.text === 'E2E Edited Question');
    results.evidence.push(`Reload check: ${results.reloadResult}`);

    // 4. DELETE Question via API
    const deletedQuestions = editedQuestions.filter(q => q.id !== newQuestion.id);
    const resDelete = await axios.put(`http://localhost:5173/api/exams/${exam.id}`, {
      title: exam.title,
      courseId: exam.courseId,
      questions: deletedQuestions
    }, { headers: { Authorization: `Bearer ${token}` } });

    if (resDelete.status === 200) {
      const examAfterDelete = await prisma.exam.findUnique({ where: { id: exam.id } });
      const afterDeleteQ = typeof examAfterDelete.questions === 'string' 
        ? JSON.parse(examAfterDelete.questions) 
        : examAfterDelete.questions;
      const afterDeleteCount = Array.isArray(afterDeleteQ) ? afterDeleteQ.length : 0;
      if (afterDeleteCount === initialCount && afterDeleteQ && !afterDeleteQ.some(q => q.id === newQuestion.id)) {
        results.deleteResult = true;
      }
      results.evidence.push(`Delete: questions count ${afterDeleteCount} (expected ${initialCount})`);
    }

    // 5. Puppeteer UI check — verify the Exam Questions UI is accessible
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
    console.log("Page contains exam:", bodyTxt.includes(exam.title));

    // Click "الأسئلة" button to open question management modal
    const questionBtnFound = await page.evaluate((examTitle) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        if (row.innerText && row.innerText.includes(examTitle)) {
          const btns = Array.from(row.querySelectorAll('button'));
          for (const btn of btns) {
            if (btn.innerText.includes('الأسئلة') || btn.innerText.includes('أسئلة')) {
              btn.click();
              return { found: true };
            }
          }
        }
      }
      return { found: false };
    }, exam.title);

    console.log("Question btn found:", questionBtnFound);

    if (questionBtnFound.found) {
      await new Promise(r => setTimeout(r, 2000));
      const modalOpen = await page.evaluate(() => !!document.querySelector('.fixed.inset-0'));
      console.log("Question modal opened:", modalOpen);
      if (modalOpen) {
        results.evidence.push("UI: Questions modal opened successfully");
      }
    }

    await browser.close();

    if (results.addResult && results.editResult && results.deleteResult && results.reloadResult) {
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

testQuestionManagement();
