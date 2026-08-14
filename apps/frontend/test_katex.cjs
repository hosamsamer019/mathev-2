const katex = require('./node_modules/katex');

const parsed = '\\begin{bmatrix}3 & 5 \\\\\\\\ 2 & 4\\end{bmatrix}';
try {
  const html = katex.renderToString(parsed, { displayMode: false, throwOnError: true });
  console.log('HTML1 length:', html.length);
} catch (e) {
  console.error('KaTeX Error1:', e.message);
}

// What if it's \\\\ instead of \\\\\\\\
const parsed2 = '\\begin{bmatrix}3 & 5 \\\\ 2 & 4\\end{bmatrix}';
try {
  const html2 = katex.renderToString(parsed2, { displayMode: false, throwOnError: true });
  console.log('HTML2 length:', html2.length);
} catch (e) {
  console.error('KaTeX Error2:', e.message);
}
