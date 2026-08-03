const fs = require('fs');
const path = require('path');

function processDir(dir) {
  let files = fs.readdirSync(dir);
  for (let file of files) {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Fix grids
      if (content.match(/grid-cols-2(?! lg| sm| md)/g) && !content.match(/grid-cols-1 sm:grid-cols-2/g)) {
        content = content.replace(/grid grid-cols-2/g, 'grid grid-cols-1 sm:grid-cols-2');
        content = content.replace(/className=\"grid-cols-2/g, 'className=\"grid-cols-1 sm:grid-cols-2');
        changed = true;
      }
      if (content.match(/grid grid-cols-3/g)) {
        content = content.replace(/grid grid-cols-3/g, 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
        changed = true;
      }
      if (content.match(/grid grid-cols-4/g)) {
        content = content.replace(/grid grid-cols-4/g, 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
        changed = true;
      }
      
      // Fix specific common grid strings we found earlier
      if (content.match(/grid-cols-2 md:grid-cols-4/g)) {
         content = content.replace(/grid-cols-2 md:grid-cols-4/g, 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4');
         changed = true;
      }
      if (content.match(/grid-cols-2 lg:grid-cols-4/g)) {
         content = content.replace(/grid-cols-2 lg:grid-cols-4/g, 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
         changed = true;
      }

      // Fix p-8 on main containers
      if (content.includes('className=\"p-8\"')) {
        content = content.replace(/className=\"p-8\"/g, 'className=\"p-4 sm:p-6 lg:p-8\"');
        changed = true;
      }

      // Fix tables
      let tableRegex = /<table className=\"w-full(\s[^\"]*)?\">/g;
      if (tableRegex.test(content) && !content.includes('overflow-x-auto')) {
          content = content.replace(/(<table className=\"w-full[^\"]*\">)/g, '<div className=\"overflow-x-auto w-full\">$1');
          content = content.replace(/(<\/table>)/g, '$1</div>');
          changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

const dirs = [
  'e:/Mathe/Mathteachersmartplatform-main/apps/frontend/src/app/components'
];

for(let d of dirs) {
    if(fs.existsSync(d)) {
        processDir(d);
    }
}
