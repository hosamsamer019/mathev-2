function normalizeLatex(text) {
  return text
    .replace(/\\\\\[/g, '\\[')
    .replace(/\\\\\]/g, '\\]')
    .replace(/\\\\\(/g, '\\(')
    .replace(/\\\\\)/g, '\\)')
    .replace(/\\{3,}/g, '\\\\');
}

const input = 'ما هو محدد المصفوفة \\(\\begin{bmatrix}3 & 5 \\\\\\\\ 2 & 4\\end{bmatrix}\\)?';
console.log('Original:', input);
console.log('Normalized:', normalizeLatex(input));

const segmentsRegex = /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$[^$\n]+?\$/g;
let match;
while ((match = segmentsRegex.exec(normalizeLatex(input))) !== null) {
  console.log('Match:', match[0]);
}

