const puppeteer = require('puppeteer');
const fs = require('fs');

async function getBrowser() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  let executablePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  const launchOptions = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };

  if (executablePath) {
    console.log(`Using browser executable: ${executablePath}`);
    launchOptions.executablePath = executablePath;
  } else {
    console.log("No explicit Chrome/Edge path found. Falling back to default Puppeteer bundled Chromium (may fail if CDN blocked).");
  }

  return await puppeteer.launch(launchOptions);
}

module.exports = { getBrowser };
