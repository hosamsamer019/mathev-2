import fs from 'fs';
import path from 'path';

const frontendDir = path.resolve('d:/Mathe/Mathteachersmartplatform-main/apps/frontend/src/app');

function getAllFiles(dir, exts = ['.tsx', '.jsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      if (exts.includes(path.extname(fullPath))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allFiles = getAllFiles(frontendDir);
const report = [];

allFiles.forEach(file => {
  if (file.includes('.test.') || file.includes('.spec.')) return;
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(frontendDir, file);

  const lines = content.split('\n');
  const fileIssues = [];

  lines.forEach((line, lineIdx) => {
    // Check if line contains non-dark, non-hover standalone light classes without dark variants
    // Match className="... bg-white ..." where bg-white is not prefixed by dark: or hover:
    const classMatches = line.match(/(?:className|class)\s*=\s*["`{]([^"`}]+)["`}]/);
    if (classMatches) {
      const classStr = classMatches[1];
      const classes = classStr.split(/\s+/);
      
      const hasLightBg = classes.some(c => /^(bg-white|bg-gray-50|bg-gray-100|bg-slate-50|bg-zinc-50)$/.test(c));
      const hasDarkBg = classes.some(c => /^dark:bg-/.test(c));
      if (hasLightBg && !hasDarkBg) {
        fileIssues.push({ line: lineIdx + 1, type: 'light-bg', text: line.trim() });
      }

      const hasDarkText = classes.some(c => /^(text-gray-900|text-gray-800|text-gray-700)$/.test(c));
      const hasDarkTextVariant = classes.some(c => /^dark:text-/.test(c));
      if (hasDarkText && !hasDarkTextVariant) {
        fileIssues.push({ line: lineIdx + 1, type: 'dark-text', text: line.trim() });
      }

      const hasLightBorder = classes.some(c => /^(border-gray-100|border-gray-200|border-gray-300)$/.test(c));
      const hasDarkBorderVariant = classes.some(c => /^dark:border-/.test(c));
      if (hasLightBorder && !hasDarkBorderVariant) {
        fileIssues.push({ line: lineIdx + 1, type: 'light-border', text: line.trim() });
      }
    }
  });

  if (fileIssues.length > 0) {
    report.push({ relPath, count: fileIssues.length, issues: fileIssues });
  }
});

report.sort((a, b) => b.count - a.count);

console.log(`Total files with issues: ${report.length}\n`);
report.forEach(r => {
  console.log(`${r.relPath}: ${r.count} issues`);
  if (process.argv.includes('--details')) {
    r.issues.slice(0, 10).forEach(i => console.log(`  L${i.line} [${i.type}]: ${i.text}`));
  }
});
