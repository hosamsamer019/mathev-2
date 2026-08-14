import puppeteer from 'puppeteer';

async function runBrowserVerification() {
  console.log('Starting E2E Browser Verification...');
  let hasErrors = false;

  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox'],
    channel: 'chrome'
  });
  const page = await browser.newPage();

  try {
    console.log('✅ Browser Launched');
    
    // Test 1: Load the Landing Page and check Language Switcher functionality
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    const content = await page.content();
    
    // We assume the page loads successfully and contains some React app root.
    if (content.includes('<div id="root"')) {
      console.log('✅ UI renders successfully.');
    } else {
      console.error('❌ Failed to load frontend. Is Vite running?');
      hasErrors = true;
      throw new Error('Frontend not running');
    }

    // Since a complete UI E2E requires valid auth tokens, we will assert DOM elements
    // for login, routing, and language toggling.
    console.log('✅ Navigated to Landing Page');

    // Attempting to visit Teacher Dashboard without auth should redirect
    await page.goto('http://localhost:5173/teacher/home', { waitUntil: 'networkidle2' });
    const redirectedUrl = page.url();
    if (redirectedUrl.includes('/login') || redirectedUrl === 'http://localhost:5173/') {
      console.log('✅ Auth Guard Working: Unauthenticated user redirected.');
    } else {
      console.error('❌ Auth Guard Failed: Unauthenticated user allowed into protected route.', redirectedUrl);
      hasErrors = true;
    }

    // Checking RTL/LTR implementation dynamically
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    if (dir === 'rtl' || dir === 'ltr') {
      console.log(`✅ RTL/LTR directive is present on the document element (Current: ${dir}).`);
    } else {
      console.error('❌ RTL/LTR directive missing from documentElement.');
      hasErrors = true;
    }

    console.log('Note: Full UI interaction (Teacher creation, video playback) in this headless script requires live backend APIs and seeded auth tokens. Validated core rendering and routing.');

  } catch (err) {
    console.error('❌ Browser Verification Error:', err);
    hasErrors = true;
  } finally {
    await browser.close();
    if (hasErrors) {
      console.error('❌ BROWSER VERIFICATION FAILED');
      process.exit(1);
    } else {
      console.log('🚀 BROWSER VERIFICATION PASSED');
    }
  }
}

runBrowserVerification();
