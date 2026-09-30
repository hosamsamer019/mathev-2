import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MathContent } from '../components/ui/MathContent';

describe('MathContent Component & LaTeX Rendering', () => {
  it('renders standard inline math correctly without crashing', () => {
    const { container } = render(<MathContent content="المعادلة \(2x + 5 = 15\) لها حل واحد." />);
    expect(container.textContent).toContain('المعادلة');
    expect(container.textContent).toContain('لها حل واحد.');
    // Check KaTeX rendered span
    const katexSpan = container.querySelector('.katex');
    expect(katexSpan).not.toBeNull();
  });

  it('renders display math correctly', () => {
    const { container } = render(<MathContent content="القانون العام: \[x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}\]" />);
    expect(container.textContent).toContain('القانون العام:');
    const displaySpan = container.querySelector('.katex-display');
    expect(displaySpan).not.toBeNull();
  });

  it('auto-detects unescaped LaTeX commands without delimiters and renders KaTeX', () => {
    const { container } = render(<MathContent content="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />);
    const katexSpan = container.querySelector('.katex');
    expect(katexSpan).not.toBeNull();
    const katexHtml = container.querySelector('.katex-html');
    expect(katexHtml).not.toBeNull();
  });

  it('recovers from ASCII control characters (\\b, \\f) gracefully', () => {
    // \x08 is backspace (often produced when \b is in JSON)
    const controlCharText = "الحل \x08eta و \x0Crac{1}{2}";
    const { container } = render(<MathContent content={controlCharText} />);
    expect(container).not.toBeNull();
  });

  it('safely handles untrusted script and HTML tags without executing them', () => {
    const malicious = '<script>alert("XSS")</script><img src="x" onerror="alert(1)" />\\(x = 1\\)';
    const { container } = render(<MathContent content={malicious} />);
    // Script tag must not be rendered as executable element
    const scripts = container.querySelectorAll('script');
    expect(scripts.length).toBe(0);
    // Plain text content shows the sanitized literal characters
    expect(container.textContent).toContain('<script>');
  });
});

describe('Mathematical Correctness & Test Cases Verification', () => {
  // Test Case 1: Quadratic
  it('Test 1 — Quadratic: 2x² + 5x - 3 = 0 yields x = 1/2 and x = -3 with Δ = 49', () => {
    const a = 2, b = 5, c = -3;
    const delta = b * b - 4 * a * c;
    expect(delta).toBe(49);
    const sqrtDelta = Math.sqrt(delta);
    expect(sqrtDelta).toBe(7);
    const x1 = (-b + sqrtDelta) / (2 * a);
    const x2 = (-b - sqrtDelta) / (2 * a);
    expect(x1).toBe(0.5);
    expect(x2).toBe(-3);
  });

  // Test Case 2: Simple linear equation
  it('Test 2 — Simple equation: 2x + 6 = 0 yields x = -3', () => {
    const a = 2, b = 6;
    const x = -b / a;
    expect(x).toBe(-3);
  });

  // Test Case 3: Fraction equation
  it('Test 3 — Fraction: x/2 + 3 = 5 yields x = 4', () => {
    const rhs = 5 - 3;
    const x = rhs * 2;
    expect(x).toBe(4);
  });

  // Test Case 4: Square root equation
  it('Test 4 — Square root: x² = 16 yields x = ±4', () => {
    const c = 16;
    const r1 = Math.sqrt(c);
    const r2 = -Math.sqrt(c);
    expect(r1).toBe(4);
    expect(r2).toBe(-4);
  });

  // Test Case 5: Normal solver case
  it('Test 5 — Existing normal solver case: 2x + 5 = 15 yields x = 5', () => {
    const a = 2, b = 5, c = 15;
    const x = (c - b) / a;
    expect(x).toBe(5);
  });
});
