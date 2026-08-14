const fs = require('fs');
const path = require('path');

const TARGET_DIRS = ['apps/frontend/src', 'services'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const KEYWORDS = [
  'Math.random', 'mock', 'dummy', 'fake', 'placeholder', 
  'sample', 'hardcoded', 'coming soon', 'test data', 'static arrays', 'sample data'
];

const results = [];

function walk(dir) {
  let list = [];
  try {
    list = fs.readdirSync(dir);
  } catch (err) {
    return;
  }
  
  list.forEach(function(file) {
    if (file === 'node_modules' || file === 'dist' || file === '.next' || file === 'build') return;
    
    file = path.join(dir, file);
    let stat = fs.statSync(file);
    
    if (stat && stat.isDirectory()) {
      walk(file);
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        searchFile(file);
      }
    }
  });
}

function searchFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // skip comments if possible, but let's just flag everything for now
    const lowerLine = line.toLowerCase();
    for (const kw of KEYWORDS) {
      if (lowerLine.includes(kw.toLowerCase())) {
        results.push({
          file: file,
          line: index + 1,
          keyword: kw,
          content: line.trim()
        });
        break; // one match per line is enough
      }
    }
  });
}

TARGET_DIRS.forEach(dir => walk(path.join(__dirname, '..', dir)));

// Format results
let report = '# Mock Data Audit Report\n\n';
report += '| FILE | LINE | KEYWORD | CONTENT |\n';
report += '|---|---|---|---|\n';

results.forEach(r => {
  report += `| ${r.file.replace(path.join(__dirname, '..'), '')} | ${r.line} | ${r.keyword} | \`${r.content.replace(/`/g, "'").substring(0, 100)}\` |\n`;
});

fs.writeFileSync(path.join(__dirname, '..', 'mock_audit_results.md'), report);
console.log(`Found ${results.length} potential mock data entries. Report saved to mock_audit_results.md`);
