import React from 'react';
import katex from 'katex';

/**
 * MathContent – renders mixed Arabic text + LaTeX math safely using KaTeX.
 *
 * Handles:
 *  - Plain text / Arabic text (passed through unchanged)
 *  - Inline math:   \( ... \)  or  $ ... $
 *  - Display math:  \[ ... \]  or  $$ ... $$
 *  - Double-escaped LaTeX from AI output:  \\( ... \\)  =>  \( ... \)
 *  - Matrices, fractions, Greek letters, powers, roots, coordinate pairs
 */

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      trust: false,
    });
  } catch {
    // If KaTeX itself throws, show the raw LaTeX wrapped in code
    return `<code class="math-error">${latex}</code>`;
  }
}

/**
 * Normalize double-escaped LaTeX from AI output.
 * AI models sometimes produce \\( instead of \( due to JSON escaping.
 */
function normalizeLatex(text: string): string {
  if (typeof text !== 'string') return '';
  
  let t = text;
  // Convert double-escaped delimiters into single-escaped ones
  t = t.replace(/\\\\\(/g, '\\(').replace(/\\\\\)/g, '\\)');
  t = t.replace(/\\\\\[/g, '\\[').replace(/\\\\\]/g, '\\]');
  
  // Matrix newline handling:
  // AI might output \\\\\\\\ (8 slashes in JSON, 4 inside JS string) 
  // We need to convert 4 backslashes into 2 backslashes for KaTeX to see it as a newline.
  t = t.replace(/\\\\\\\\/g, '\\\\');
  
  return t;
}

interface Segment {
  type: 'text' | 'inline-math' | 'display-math';
  content: string;
}

/**
 * Parse the input string into alternating text / math segments.
 *
 * Supported delimiters (display first for correct precedence):
 *   \[ ... \]   => display math
 *   $$ ... $$   => display math
 *   \( ... \)   => inline math
 *   $ ... $     => inline math (non-greedy, no newlines allowed inside)
 */
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Order matters: display delimiters before inline to avoid partial matches
  const mathRegex = /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\$[^$\n]+?\$/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text)) !== null) {
    // Preceding plain text
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    let isDisplay = false;
    let latexContent = raw;

    if (raw.startsWith('\\[')) {
      isDisplay = true;
      latexContent = raw.slice(2, -2).trim();
    } else if (raw.startsWith('$$')) {
      isDisplay = true;
      latexContent = raw.slice(2, -2).trim();
    } else if (raw.startsWith('\\(')) {
      isDisplay = false;
      latexContent = raw.slice(2, -2).trim();
    } else if (raw.startsWith('$')) {
      isDisplay = false;
      latexContent = raw.slice(1, -1).trim();
    }

    segments.push({
      type: isDisplay ? 'display-math' : 'inline-math',
      content: latexContent,
    });

    lastIndex = match.index + raw.length;
  }

  // Any remaining text after the last match
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
}

interface MathContentProps {
  /** Raw content string – may contain Arabic text, LaTeX, or both */
  content: string;
  className?: string;
}

/**
 * Renders a string that may contain LaTeX math mixed with Arabic/English text.
 *
 * Example input:
 *   "أوجد المميز للمعادلة التربيعية \(2x^2 - 5x + 3 = 0\)"
 *
 * Rendered output:
 *   أوجد المميز للمعادلة التربيعية   [KaTeX-typeset: 2x² − 5x + 3 = 0]
 *
 * Example with double-escaped input (from AI):
 *   "ما هو محدد المصفوفة \\(\\begin{bmatrix}3 & 5 \\\\\\\\ 2 & 4\\end{bmatrix}\\)?"
 *   => normalized to \( ... \) then rendered as a properly typeset matrix
 */
export const MathContent: React.FC<MathContentProps> = ({ content, className }) => {
  if (!content) return null;

  const normalized = normalizeLatex(content);
  const segments = parseSegments(normalized);

  return (
    <span className={className} dir="rtl">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.content}</span>;
        }

        const html = renderKatex(seg.content, seg.type === 'display-math');

        return (
          <span
            key={i}
            className={seg.type === 'display-math' ? 'block my-2 overflow-x-auto text-center' : 'inline mx-1'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};

export default MathContent;
