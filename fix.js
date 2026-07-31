const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('apps/frontend/src');
files.forEach(f => {
    const orig = fs.readFileSync(f, 'utf8');
    const modified = orig.replace(/from\s+['"]react-router['"]/g, "from 'react-router-dom'");
    if (orig !== modified) {
        fs.writeFileSync(f, modified);
        console.log('Fixed', f);
    }
});
