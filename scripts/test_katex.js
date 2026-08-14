const katex = require('katex');

const parsed = '\\begin{bmatrix}3 & 5 \\\\\\\\ 2 & 4\\end{bmatrix}';
try {
  const html = katex.renderToString(parsed, { displayMode: false, throwOnError: false });
  console.log('HTML:', html);
} catch (e) {
  console.error('KaTeX Error:', e);
}

// What if it's \\\\ instead of \\\\\\\\
const parsed2 = '\\begin{bmatrix}3 & 5 \\\\ 2 & 4\\end{bmatrix}';
try {
  const html2 = katex.renderToString(parsed2, { displayMode: false, throwOnError: false });
  console.log('HTML2 length:', html2.length);
} catch (e) {
  console.error('KaTeX Error2:', e);
}
