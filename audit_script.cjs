const fs = require('fs');
const path = require('path');

const ROOT = 'd:\\Mathe\\Mathteachersmartplatform-main';
const FRONTEND_DIR = path.join(ROOT, 'apps', 'frontend', 'src', 'app', 'components');
const SERVICES_DIR = path.join(ROOT, 'services');

function findFiles(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    // Ignore node_modules, dist, .git
    if (file === 'node_modules' || file === 'dist' || file === '.git') return;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, ext));
    } else {
      if (fullPath.endsWith(ext)) results.push(fullPath);
    }
  });
  return results;
}

const frontendFiles = findFiles(FRONTEND_DIR, '.tsx');
const backendFiles = findFiles(SERVICES_DIR, '.ts');

let report = `# API Integration Audit Report\n\n`;

report += `## 1. Backend Endpoint Discovery\n\n`;
let backendEndpoints = 0;
const endpoints = [];
backendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const routeRegex = /(router|app)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[2].toUpperCase();
    const route = match[3];
    endpoints.push({ method, route, file });
    backendEndpoints++;
  }
});
endpoints.forEach(ep => {
  report += `- **${ep.method}** \`${ep.route}\` (Found in \`${ep.file.replace(ROOT, '')}\`)\n`;
});

report += `\n## 2. Frontend Component Audit & Missing Connections\n\n`;
let frontendChecked = frontendFiles.length;
let connectedPages = 0;
let disconnectedPages = 0;
let mockedPages = 0;

frontendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const hasApi = /authApi|userApi|aiApi|courseApi|examApi|homeworkApi|analyticsApi|questionApi|notificationApi|axios\.|fetch\(|useQuery|useMutation/g.test(content);
  const hasMock = /mock|fake|dummy|const data = \[\{/i.test(content);
  
  if (hasApi) {
    connectedPages++;
  } else {
    disconnectedPages++;
  }
  if (hasMock) {
    mockedPages++;
  }

  if (hasMock || !hasApi) {
    report += `### ❌ \`${path.basename(file)}\`\n`;
    report += `- **Path:** \`${file.replace(ROOT, '')}\`\n`;
    if (!hasApi) report += `- **Issue:** No API connection found. Page never calls backend.\n`;
    if (hasMock) report += `- **Issue:** Contains hardcoded/mocked data.\n`;
    report += `- **Severity:** High\n`;
    report += `- **Recommended Fix:** Implement actual API integration using the corresponding service.\n\n`;
  }
});

report += `\n## 3. Summary\n\n`;
report += `- **Total frontend pages checked:** ${frontendChecked}\n`;
report += `- **Total backend endpoints found:** ${backendEndpoints}\n`;
report += `- **Total connected frontend pages:** ${connectedPages}\n`;
report += `- **Total disconnected/mocked frontend pages:** ${disconnectedPages}\n`;
const score = frontendChecked === 0 ? 0 : Math.round((connectedPages / frontendChecked) * 100);
report += `- **Overall integration health score:** ${score}%\n`;

fs.writeFileSync(path.join(ROOT, 'api_integration_audit_report.md'), report, 'utf-8');
console.log('Report generated successfully.');
