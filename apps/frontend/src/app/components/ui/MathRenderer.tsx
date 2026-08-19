import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  expression?: string | null;
  block?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ expression, block = false }) => {
  if (!expression) return null;

  // Clean the expression of common LLM artifacts if any leak through
  let cleanExpr = expression.trim();
  if (cleanExpr.startsWith('\\(') && cleanExpr.endsWith('\\)')) {
    cleanExpr = cleanExpr.slice(2, -2).trim();
  } else if (cleanExpr.startsWith('\\[') && cleanExpr.endsWith('\\]')) {
    cleanExpr = cleanExpr.slice(2, -2).trim();
  }
  if (cleanExpr.startsWith('$$') && cleanExpr.endsWith('$$')) {
    cleanExpr = cleanExpr.slice(2, -2).trim();
    block = true;
  }

  try {
    return (
      <span dir="ltr" className="inline-block" style={{ direction: 'ltr', margin: '0 4px' }}>
        {block ? <BlockMath math={cleanExpr} /> : <InlineMath math={cleanExpr} />}
      </span>
    );
  } catch (error) {
    console.error('KaTeX rendering error', error);
    // Fallback if KaTeX fails parsing
    return <span className="text-red-500" dir="ltr">{cleanExpr}</span>;
  }
};
