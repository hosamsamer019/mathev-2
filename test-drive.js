const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting Puppeteer test...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    // Click Admin role "إدارة"
    const adminBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('إدارة'));
    });
    if (adminBtn) {
      await adminBtn.click();
      console.log('Clicked Admin role');
    }

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'admin@edu.com');
    await page.type('input[type="password"]', '123456');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    console.log('Logged in successfully.');

    console.log('Navigating to teacher courses...');
    await page.goto('http://localhost:5173/teacher', { waitUntil: 'networkidle2' });
    
    await page.screenshot({ path: 'C:\\Users\\Hossam\\.gemini\\antigravity-ide\\brain\\75d7d76e-4a86-4021-83c5-b32f6bd431da\\scratch\\teacher-dashboard.png' });

    // Wait for Add Video
    const addBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('إضافة فيديو'));
    });
    
    if (addBtn) {
      await addBtn.click();
      console.log('Clicked Add Video');
    } else {
      console.log('Could not find Add Video button. Dumping HTML.');
      const html = await page.content();
      fs.writeFileSync('C:\\Users\\Hossam\\.gemini\\antigravity-ide\\brain\\75d7d76e-4a86-4021-83c5-b32f6bd431da\\scratch\\teacher.html', html);
      return;
    }

    await page.waitForTimeout(1000);
    
    await page.type('input[placeholder*="اسم الفيديو"]', 'Test Drive Video');
    
    const selects = await page.$$('select');
    if (selects.length > 0) {
      await page.select('select', await page.evaluate(el => el.options[1].value, selects[0]));
    }

    const driveOption = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Google Drive'));
    });
    if (driveOption) {
      await driveOption.click();
      console.log('Selected Google Drive');
    }

    await page.waitForTimeout(500);

    const urlInput = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.find(i => i.placeholder && i.placeholder.includes('drive.google.com'));
    });
    if (urlInput) {
      await urlInput.type('https://drive.google.com/file/d/1Z_gR27fQ2B5vM7_1VbF0zG7gY9_wP_P1/view');
    }

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('إضافة الفيديو'));
    });
    
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submitted video form');
    }

    await page.waitForSelector('text/تمت إضافة الفيديو بنجاح', { timeout: 5000 });
    console.log('Success modal appeared!');
    
    const okBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('حسنًا'));
    });
    if (okBtn) {
      await okBtn.click();
      console.log('Clicked OK on modal');
    }

    // Instead of clicking around, fetch the created video ID
    console.log('Going to extract video from API...');
    const result = await page.evaluate(async () => {
       const res = await fetch('/api/courses');
       const courses = await res.json();
       for (const c of courses) {
         if (c.videos && c.videos.length > 0) {
           const v = c.videos.find(x => x.title === 'Test Drive Video');
           if (v) return v.id;
         }
       }
       return null;
    });
    
    console.log('Found video ID:', result);
    
    if (result) {
       await page.goto(`http://localhost:5173/student/video/${result}`, { waitUntil: 'networkidle2' });
       await page.waitForTimeout(3000);
       await page.screenshot({ path: 'C:\\Users\\Hossam\\.gemini\\antigravity-ide\\brain\\75d7d76e-4a86-4021-83c5-b32f6bd431da\\scratch\\student-player.png' });
       
       const iframeSrc = await page.evaluate(() => {
         const iframes = document.querySelectorAll('iframe');
         return iframes.length > 0 ? iframes[0].src : null;
       });
       console.log('Iframe src:', iframeSrc);
    }

    console.log('Test completed successfully.');

  } catch (err) {
    console.error('Test failed:', err);
    await page.screenshot({ path: 'C:\\Users\\Hossam\\.gemini\\antigravity-ide\\brain\\75d7d76e-4a86-4021-83c5-b32f6bd431da\\scratch\\error.png' });
    const html = await page.content();
    fs.writeFileSync('C:\\Users\\Hossam\\.gemini\\antigravity-ide\\brain\\75d7d76e-4a86-4021-83c5-b32f6bd431da\\scratch\\error.html', html);
  } finally {
    await browser.close();
  }
})();
