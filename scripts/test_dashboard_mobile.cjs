const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = 5198;
const DIST_PATH = path.join(__dirname, '..', 'apps', 'frontend', 'dist');

function startServer() {
  const app = express();
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  console.log('Testing SharedLayout Mobile Sidebar Toggle in Browser...');
  const server = await startServer();
  let browser;

  try {
    const customChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: customChrome,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

    // Verify Landing Page mobile toggle
    const landingToggle = await page.evaluate(async () => {
      const btn = document.querySelector('button[aria-label="Open menu"]');
      if (!btn) return { ok: false, error: 'Landing mobile toggle not found' };
      btn.click();
      await new Promise(r => setTimeout(r, 200));
      const isX = !!btn.querySelector('.lucide-x');
      const label = btn.getAttribute('aria-label');
      return { ok: isX && label === 'Close menu' };
    });

    console.log('Landing Mobile Toggle Test:', landingToggle.ok ? 'PASS' : 'FAIL');
    if (!landingToggle.ok) process.exit(1);

    console.log('ALL BROWSER MOBILE TOGGLE TESTS PASSED');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
