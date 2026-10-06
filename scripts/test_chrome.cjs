const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  let browser;
  try {
    const customPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const opts = {
      headless: 'new',
      executablePath: customPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    browser = await puppeteer.launch(opts);
    console.log("Puppeteer browser launched successfully with executable:", browser.process()?.spawnfile || "default");
    const page = await browser.newPage();
    await page.setContent('<h1>AL-SADEN Responsive Audit Initialized</h1>');
    const content = await page.$eval('h1', el => el.textContent);
    console.log("Rendered test content:", content);
    await browser.close();
    console.log("SUCCESS");
  } catch (err) {
    console.error("Browser launch error:", err);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
