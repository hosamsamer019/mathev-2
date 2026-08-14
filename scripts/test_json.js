const dbStr = '\\(\\begin{bmatrix}3 & 5 \\\\\\\\ 2 & 4\\end{bmatrix}\\)';
const jsonStr = JSON.stringify(dbStr);
console.log('JSON from DB:', jsonStr);
const parsed = JSON.parse(jsonStr);
console.log('Parsed in browser:', parsed);
console.log('Length of start:', parsed.substring(0, 2));

const mathRegex = /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$[^$\n]+?\$/g;
console.log('Does mathRegex match parsed?', mathRegex.test(parsed));

const r1 = /\\\\\(/g;
console.log('Does normalizeLatex match parsed?', r1.test(parsed));
