const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = 5199;
const DIST_PATH = path.join(__dirname, '..', 'apps', 'frontend', 'dist');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'dist_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'Small mobile', width: 320, height: 568, isMobile: true },
  { name: 'Standard mobile', width: 375, height: 667, isMobile: true },
  { name: 'Large mobile', width: 430, height: 932, isMobile: true },
  { name: 'Small tablet', width: 768, height: 1024, isMobile: false },
  { name: 'Large tablet', width: 1024, height: 1366, isMobile: false },
  { name: 'Laptop', width: 1280, height: 720, isMobile: false },
  { name: 'Desktop', width: 1440, height: 900, isMobile: false },
  { name: 'Large desktop', width: 1920, height: 1080, isMobile: false },
];

function startServer() {
  const app = express();
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`[Server] Static frontend server listening on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

(async () => {
  console.log('=====================================================');
  console.log('AL-SADEN — Responsive & OX Digital Ownership Audit');
  console.log('=====================================================');

  const server = await startServer();
  let browser;

  const results = [];

  try {
    const customChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: customChrome,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    for (const vp of VIEWPORTS) {
      console.log(`\n-----------------------------------------------------`);
      console.log(`Testing Viewport: ${vp.name} (${vp.width} × ${vp.height})`);
      console.log(`-----------------------------------------------------`);

      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

      // 1. Horizontal overflow check
      const overflowMetrics = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const clientWidth = document.documentElement.clientWidth;
        const hasHorizontalScroll = scrollWidth > innerWidth;

        // Find any elements exceeding the viewport
        const elements = document.querySelectorAll('*');
        const overflowingElements = [];
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > innerWidth + 1) { // 1px tolerance for subpixel rounding
            const tag = el.tagName.toLowerCase();
            const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 3).join('.') : '';
            overflowingElements.push({ tag, cls, right: rect.right, innerWidth });
          }
        });

        return {
          scrollWidth,
          innerWidth,
          clientWidth,
          hasHorizontalScroll,
          overflowCount: overflowingElements.length,
          sampleOverflows: overflowingElements.slice(0, 3)
        };
      });

      console.log(`[Overflow Check] scrollWidth: ${overflowMetrics.scrollWidth}px, innerWidth: ${overflowMetrics.innerWidth}px, Has Overflow: ${overflowMetrics.hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);

      // 2. Arabic RTL & Mojibake Check
      const arabicCheck = await page.evaluate(() => {
        const text = document.body.innerText;
        const hasMojibake = /[\u00C0-\u00FF]{2,}|Ø|Ù|Ú|Û|Ý/.test(text.replace(/©/g, ''));
        const hasArabicTitle = text.includes('تعلّم الرياضيات') || text.includes('بذكاء حقيقي');
        const dir = document.documentElement.dir || document.querySelector('[dir]')?.getAttribute('dir');
        return { hasMojibake, hasArabicTitle, dir };
      });

      console.log(`[Arabic RTL Check] Dir: ${arabicCheck.dir}, Has Arabic Title: ${arabicCheck.hasArabicTitle}, Mojibake Detected: ${arabicCheck.hasMojibake ? 'YES (FAIL)' : 'NO (PASS)'}`);

      // 3. Public Landing Header Verification: NO Hamburger/Menu and simplified CTA
      const headerCheck = await page.evaluate(() => {
        const nav = document.querySelector('nav');
        const hasMenuButton = !!nav?.querySelector('button[aria-label="Open menu"], button[aria-label="Close menu"], .lucide-menu');
        const hasMobileDrawer = !!document.querySelector('aside.md\\:hidden');
        const hasLogo = !!nav?.querySelector('img[alt="AL-SADEN Logo"]');
        const buttons = Array.from(nav?.querySelectorAll('button') || []).map(b => b.textContent.trim());
        const hasDuplicateLogin = buttons.includes('تسجيل الدخول');
        const hasPrimaryStart = buttons.some(b => b.includes('ابدأ الآن'));

        return {
          hasMenuButton,
          hasMobileDrawer,
          hasLogo,
          buttons,
          hasDuplicateLogin,
          hasPrimaryStart,
          pass: !hasMenuButton && !hasMobileDrawer && hasLogo && !hasDuplicateLogin && hasPrimaryStart
        };
      });

      console.log(`[Landing Header Check] Hamburger Removed: ${!headerCheck.hasMenuButton ? 'YES (PASS)' : 'NO (FAIL)'}, No Duplicate Login: ${!headerCheck.hasDuplicateLogin ? 'YES (PASS)' : 'NO (FAIL)'}, Header Buttons: [${headerCheck.buttons.join(', ')}]`);

      // 4. OX Digital Legal Ownership Statement & Link Check
      const oxCredit = await page.evaluate(() => {
        const link = document.querySelector('footer a[href="https://ox-digital-eg.vercel.app/"]');
        if (!link) return { found: false };
        const text = link.textContent.trim();
        const target = link.getAttribute('target');
        const rel = link.getAttribute('rel');
        const footerText = document.querySelector('footer')?.innerText || '';
        const hasOwnership = footerText.includes('منصة وبرمجية مملوكة بالكامل لـ') && footerText.includes('OX Digital');
        return {
          found: true,
          text,
          target,
          rel,
          hasOwnership,
          pass: text.includes('OX Digital') && target === '_blank' && hasOwnership
        };
      });

      console.log(`[OX Digital Ownership] Found: ${oxCredit.found}, Full Ownership Statement: ${oxCredit.hasOwnership ? 'YES (PASS)' : 'NO (FAIL)'}, Target: "${oxCredit.target}"`);

      // 5. Visual Sections Existence & Layout Check
      const sectionsCheck = await page.evaluate(() => {
        const heroH1 = document.querySelector('h1')?.textContent.trim();
        const features = document.querySelectorAll('#features .rounded-2xl');
        const pricingCards = document.querySelectorAll('#pricing .rounded-3xl');
        const testimonials = document.querySelectorAll('#testimonials .rounded-2xl');
        const footer = document.querySelector('footer');

        return {
          heroH1Present: !!heroH1,
          featuresCount: features.length,
          pricingCount: pricingCards.length,
          testimonialsCount: testimonials.length,
          footerPresent: !!footer,
        };
      });

      // 6. Capture full page screenshot for visual proof
      const screenshotFileName = `landing_clean_${vp.width}x${vp.height}.png`;
      const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFileName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[Screenshot Saved] -> ${screenshotPath}`);

      const overallPass = !overflowMetrics.hasHorizontalScroll &&
                          !arabicCheck.hasMojibake &&
                          headerCheck.pass &&
                          oxCredit.pass;

      results.push({
        viewport: `${vp.width}×${vp.height}`,
        name: vp.name,
        tested: 'YES',
        horizontalOverflow: overflowMetrics.hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)',
        layoutIssues: overflowMetrics.hasHorizontalScroll ? 'Horizontal overflow' : 'None',
        arabicRtl: arabicCheck.hasMojibake ? 'Mojibake detected' : 'Perfect Unicode RTL',
        landingMenu: headerCheck.hasMenuButton ? 'FAIL (Menu present)' : 'REMOVED (PASS)',
        oxDigitalOwnership: oxCredit.pass ? 'FULL OWNERSHIP (PASS)' : 'FAIL',
        result: overallPass ? 'PASS' : 'FAIL',
        screenshot: screenshotFileName
      });
    }

    console.log('\n=====================================================');
    console.log('FINAL RESPONSIVE & OWNERSHIP AUDIT MATRIX');
    console.log('=====================================================');
    console.table(results.map(r => ({
      Viewport: r.viewport,
      Tested: r.tested,
      'Horizontal Overflow': r.horizontalOverflow,
      'Landing Menu': r.landingMenu,
      'Arabic RTL': r.arabicRtl,
      'OX Digital Ownership': r.oxDigitalOwnership,
      Result: r.result
    })));

    const summaryPath = path.join(SCREENSHOT_DIR, 'audit_summary_final.json');
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
    console.log(`\nAudit summary JSON written to: ${summaryPath}`);

    const allPassed = results.every(r => r.result === 'PASS');
    console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL VIEWPORTS PASS' : 'SOME VIEWPORTS FAILED'}`);

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
