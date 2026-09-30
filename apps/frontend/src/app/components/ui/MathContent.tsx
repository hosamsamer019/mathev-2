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
 *  - Auto-detection of unescaped LaTeX math commands (e.g. \frac, \sqrt, \pm, \Delta)
 *  - Matrices, fractions, Greek letters, powers, roots, coordinate pairs
 */

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      trust: false, // Strict security against script injection
    });
  } catch {
    // If KaTeX itself throws, show the raw LaTeX wrapped safely
    return `<code class="math-error text-red-500 font-mono text-sm">${latex}</code>`;
  }
}

/**
 * Normalize double-escaped LaTeX, control characters, and auto-detect raw LaTeX commands.
 */
function normalizeLatex(text: string): string {
  if (typeof text !== 'string') return '';
  
  let t = text;

  // Clean ASCII control characters (e.g., 0x08 backspace, 0x0C form feed from JSON parsing)
  t = t.replace(/\x08/g, '\\b').replace(/\x0C/g, '\\f');

  // Convert double-escaped delimiters into single-escaped ones
  t = t.replace(/\\\\\(/g, '\\(').replace(/\\\\\)/g, '\\)');
  t = t.replace(/\\\\\[/g, '\\[').replace(/\\\\\]/g, '\\]');
  
  // Matrix newline handling
  t = t.replace(/\\\\\\\\/g, '\\\\');

  // Check if string contains standard LaTeX math delimiters
  const hasDelimiters = /\\\[|\\\(|\$\$|\$/.test(t);

  // If delimiters are missing but LaTeX math commands are present
  const hasLatexCommands = /\\(?:frac|sqrt|pm|Delta|delta|alpha|beta|theta|pi|int|sum|times|div|le|ge|neq|cdot|approx|quad|text|begin|left|right|mathbb)/.test(t);

  if (!hasDelimiters && hasLatexCommands) {
    // Check if it's pure math without Arabic text
    if (!/[\u0600-\u06FF]/.test(t)) {
      t = `\\[${t.trim()}\\]`;
    } else {
      // Mixed Arabic text and raw LaTeX commands — auto-wrap math expressions in \( ... \)
      t = t.replace(/((?:[a-zA-Z0-9_^\+\-\*\/=\(\)\s\\]*(?:\\(?:frac|sqrt|pm|Delta|delta|alpha|beta|theta|pi|times|div|le|ge|neq|cdot|approx|quad|text|begin|left|right)[a-zA-Z0-9_^\+\-\*\/=\(\)\s\\\{\}]*))+)/g, (m) => {
        const trimmed = m.trim();
        if (trimmed.length > 0 && !/[\u0600-\u06FF]/.test(trimmed)) {
          return ` \\(${trimmed}\\) `;
        }
        return m;
      });
    }
  }
  
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
 */
export const MathContent: React.FC<MathContentProps> = ({ content, className }) => {
  if (!content) return null;

  const normalized = normalizeLatex(content);
  const segments = parseSegments(normalized);

  return (
    <span className={className} dir="rtl">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          // Render plain text directly (safe against HTML/JS injection)
          return <span key={i}>{seg.content}</span>;
        }

        const html = renderKatex(seg.content, seg.type === 'display-math');

        return (
          <span
            key={i}
            dir="ltr"
            className={
              seg.type === 'display-math'
                ? 'block my-2 overflow-x-auto max-w-full text-center py-1 px-2 text-inherit'
                : 'inline-block max-w-full overflow-x-auto align-middle mx-1 py-0.5 text-inherit'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};

export default MathContent;
