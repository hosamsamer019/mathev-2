import { logger } from '@shared/utils';
import * as math from 'mathjs';

// ─── Validation Status ────────────────────────────────────────────────────────
export type ValidationStatus =
  | 'STRUCTURALLY_VALID'
  | 'MATHEMATICALLY_VERIFIED'
  | 'NEEDS_REVIEW'
  | 'INVALID';

export interface ValidationResult {
  status: ValidationStatus;
  issues: string[];
  warnings: string[];
}

// ─── Question shape used by validation ────────────────────────────────────────
interface ValidatableQuestion {
  type: string;
  topic: string;
  difficulty: string;
  questionText: string;
  mathExpression?: string | null;
  given?: string[] | null;
  required?: string | null;
  diagram?: any | null;
  options?: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  solutionSteps?: string[];
  generationLogic?: {
    questionDesign: string;
    mathematicalMethod: string;
    difficultyReason: string;
    learningObjective: string;
  } | null;
  solutionExplanation?: string | null;
  validationStatus?: ValidationStatus;
  [key: string]: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — Structural Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateStructure(q: ValidatableQuestion): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!q.questionText || q.questionText.trim().length < 5) {
    issues.push('questionText is missing or too short.');
  }
  if (!q.topic || q.topic.trim() === '') {
    issues.push('topic is missing.');
  }
  if (!q.difficulty) {
    issues.push('difficulty is missing.');
  }
  if (!q.correctAnswer || q.correctAnswer.trim() === '') {
    issues.push('correctAnswer is missing.');
  }

  if (q.type === 'multiple_choice') {
    if (!q.options || q.options.length !== 4) {
      issues.push(`Must have exactly 4 options, found ${q.options?.length ?? 0}.`);
    } else {
      // correctAnswer must reference a valid option id
      const validIds = q.options.map(o => o.id);
      if (!validIds.includes(q.correctAnswer)) {
        issues.push(`correctAnswer '${q.correctAnswer}' not found in option IDs [${validIds.join(', ')}].`);
      }

      // Detect duplicate option texts (exact)
      const texts = q.options.map(o => o.text.trim().toLowerCase());
      const uniqueTexts = new Set(texts);
      if (uniqueTexts.size < texts.length) {
        issues.push('Duplicate option texts detected.');
      }
    }
  }

  // Points must be positive if present
  if (q.points !== undefined && (typeof q.points !== 'number' || q.points <= 0)) {
    issues.push(`Points must be a positive number, found '${q.points}'.`);
  }

  return { isValid: issues.length === 0, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — LaTeX Syntax Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalid LaTeX commands that are known to cause rendering failures.
 */
const INVALID_LATEX_COMMANDS = [
  '\\\\begin{', '\\\\end{', '\\\\documentclass', '\\\\usepackage',
  '\\\\text{', // not invalid per se but must be balanced
];

const FORBIDDEN_DELIMITERS = ['\\(', '\\)', '\\[', '\\]', '$$'];

function validateLatexField(str: string | null | undefined, fieldName: string): string[] {
  const issues: string[] = [];
  if (!str) return issues;

  // Check for forbidden delimiter wrappers that LLMs sometimes add
  for (const delim of FORBIDDEN_DELIMITERS) {
    if (str.includes(delim)) {
      issues.push(`Field '${fieldName}' contains forbidden LaTeX delimiter '${delim}'. Strip delimiters and pass raw expression.`);
    }
  }

  // Balanced braces check
  let braceCount = 0;
  for (const char of str) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) {
      issues.push(`Unbalanced braces in '${fieldName}' (extra closing brace).`);
      return issues;
    }
  }
  if (braceCount !== 0) {
    issues.push(`Unbalanced braces in '${fieldName}' (${braceCount} unclosed brace(s)).`);
  }

  // Check for clearly broken frac, sqrt, log structures
  const fracMatches = str.match(/\\frac/g) || [];
  const fracBraceCheck = str.match(/\\frac\s*\{[^}]*\}\s*\{[^}]*\}/g) || [];
  if (fracMatches.length > 0 && fracBraceCheck.length < fracMatches.length) {
    issues.push(`Malformed \\frac in '${fieldName}' — requires two brace groups: \\frac{numerator}{denominator}.`);
  }

  const sqrtMatches = str.match(/\\sqrt/g) || [];
  const sqrtBraceCheck = str.match(/\\sqrt\s*\{[^}]*\}/g) || [];
  if (sqrtMatches.length > 0 && sqrtBraceCheck.length < sqrtMatches.length) {
    // Allow \sqrt{x} but also \sqrt x (single char without braces)
    const sqrtNoBrace = str.match(/\\sqrt\s+[a-zA-Z0-9]/g) || [];
    if (sqrtNoBrace.length + sqrtBraceCheck.length < sqrtMatches.length) {
      issues.push(`Malformed \\sqrt in '${fieldName}'.`);
    }
  }

  return issues;
}

function validateLatexSyntax(q: ValidatableQuestion): { issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  const mathExprIssues = validateLatexField(q.mathExpression, 'mathExpression');
  issues.push(...mathExprIssues);

  if (q.solutionSteps) {
    q.solutionSteps.forEach((step, idx) => {
      const stepIssues = validateLatexField(step, `solutionSteps[${idx}]`);
      issues.push(...stepIssues);
    });
  }

  if (q.options) {
    q.options.forEach((opt) => {
      const optIssues = validateLatexField(opt.text, `option[${opt.id}]`);
      issues.push(...optIssues);
    });
  }

  // Warn if mathExpression is absent for algebraic or geometric topics
  const requiresMath = ['جبر', 'معادل', 'كسر', 'جذر', 'لوغاريتم', 'هندس', 'مثلث', 'متتالي', 'دال'];
  const topicLower = (q.topic || '').toLowerCase();
  if (requiresMath.some(t => topicLower.includes(t)) && !q.mathExpression) {
    warnings.push('Topic appears mathematical but mathExpression is empty — teacher should review.');
  }

  return { issues, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — Mathematical Consistency (using mathjs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a numeric answer from an option text like "x = 6", "6", "x=6", etc.
 * Returns null if extraction fails.
 */
function extractNumericAnswer(text: string): number | null {
  try {
    // Remove Arabic text and LaTeX formatting artifacts
    let cleaned = text
      .replace(/[أ-ي\u0600-\u06FF]/g, '')   // remove Arabic chars
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\\\/g, '')
      .replace(/[\s,]/g, '')
      .trim();

    // Handle "x = 6" or "= 6" patterns
    const eqMatch = cleaned.match(/=\s*(-?[\d.\/]+)/);
    if (eqMatch) cleaned = eqMatch[1];

    const val = math.evaluate(cleaned);
    if (typeof val === 'number' && isFinite(val)) return val;
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to evaluate a LaTeX linear equation mathExpression for a given x value.
 * Supports forms: ax + b = c, ax - b = c, etc.
 * Returns true if LHS === RHS when x=value, false if not, null if unsupported.
 */
function verifyLinearEquation(expression: string, xValue: number): boolean | null {
  try {
    let expr = expression
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\/g, '')
      .trim();

    const parts = expr.split('=');
    if (parts.length !== 2) return null;

    const scope = { x: xValue };
    const lhs = math.evaluate(parts[0].trim(), scope);
    const rhs = math.evaluate(parts[1].trim(), scope);

    if (typeof lhs !== 'number' || typeof rhs !== 'number') return null;
    return Math.abs(lhs - rhs) < 0.001;
  } catch {
    return null;
  }
}

/**
 * Verify arithmetic/algebraic question by substituting the claimed answer.
 */
function verifyAlgebra(q: ValidatableQuestion): { verified: boolean | null; issues: string[] } {
  const issues: string[] = [];

  if (!q.mathExpression) return { verified: null, issues };
  if (!q.options || q.options.length !== 4) return { verified: null, issues };

  // Find the option marked as correct
  const correctOpt = q.options.find(o => o.id === q.correctAnswer);
  if (!correctOpt) return { verified: null, issues };

  const xValue = extractNumericAnswer(correctOpt.text);
  if (xValue === null) return { verified: null, issues };

  const result = verifyLinearEquation(q.mathExpression, xValue);
  if (result === null) return { verified: null, issues };

  if (!result) {
    issues.push(
      `Answer verification FAILED: substituting x=${xValue} into '${q.mathExpression}' does not produce a true equation.`
    );
    return { verified: false, issues };
  }

  // Additionally check for mathematically equivalent duplicate options
  const numericAnswers = q.options.map(o => extractNumericAnswer(o.text));
  const definedNums = numericAnswers.filter(v => v !== null) as number[];
  if (definedNums.length > 1) {
    for (let i = 0; i < definedNums.length; i++) {
      for (let j = i + 1; j < definedNums.length; j++) {
        if (Math.abs(definedNums[i] - definedNums[j]) < 0.001) {
          issues.push(`Options appear to contain numerically equivalent answers: ${definedNums[i]} and ${definedNums[j]}.`);
        }
      }
    }
  }

  return { verified: issues.length === 0, issues };
}

/**
 * Verify geometry: compute distances from vertex coordinates and check
 * against edge labels, triangle inequality, Pythagorean theorem if applicable.
 */
function verifyGeometry(q: ValidatableQuestion): { verified: boolean | null; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  const diagram = q.diagram;
  if (!diagram || !diagram.vertices || !diagram.edges) return { verified: null, issues, warnings };

  const vertices: { id: string; x: number; y: number; label?: string }[] = diagram.vertices;
  const edges: { from: string; to: string; label?: string }[] = diagram.edges;

  // Validate vertex coordinates exist
  for (const v of vertices) {
    if (typeof v.x !== 'number' || typeof v.y !== 'number') {
      issues.push(`Vertex '${v.id}' has non-numeric coordinates.`);
      return { verified: false, issues, warnings };
    }
  }

  // Build a lookup map
  const vMap = new Map<string, { x: number; y: number }>();
  for (const v of vertices) vMap.set(v.id, { x: v.x, y: v.y });

  // Compute actual distances and verify against labels
  for (const edge of edges) {
    const from = vMap.get(edge.from);
    const to = vMap.get(edge.to);

    if (!from || !to) {
      issues.push(`Edge references unknown vertex: from='${edge.from}', to='${edge.to}'.`);
      continue;
    }

    const actualDist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));

    if (edge.label) {
      // Try to extract numeric distance from label
      const labelNum = parseFloat(edge.label.replace(/[^0-9.]/g, ''));
      if (!isNaN(labelNum)) {
        const tolerance = actualDist * 0.05; // 5% tolerance for rounding
        if (Math.abs(actualDist - labelNum) > Math.max(tolerance, 0.1)) {
          issues.push(
            `Edge ${edge.from}→${edge.to}: label says ${labelNum} but computed distance is ${actualDist.toFixed(2)}.`
          );
        }
      }
    }
  }

  // Triangle inequality check (if 3 vertices)
  if (vertices.length === 3) {
    const vArr = vertices.map(v => vMap.get(v.id)!);
    const sides = [
      Math.sqrt(Math.pow(vArr[1].x - vArr[0].x, 2) + Math.pow(vArr[1].y - vArr[0].y, 2)),
      Math.sqrt(Math.pow(vArr[2].x - vArr[1].x, 2) + Math.pow(vArr[2].y - vArr[1].y, 2)),
      Math.sqrt(Math.pow(vArr[0].x - vArr[2].x, 2) + Math.pow(vArr[0].y - vArr[2].y, 2)),
    ].sort((a, b) => a - b);

    if (sides[0] + sides[1] <= sides[2]) {
      issues.push(`Triangle inequality violated: sides ${sides.map(s => s.toFixed(2)).join(', ')} cannot form a triangle.`);
    }

    // Check for degenerate (zero area) triangle
    const area = Math.abs(
      (vArr[0].x * (vArr[1].y - vArr[2].y) + vArr[1].x * (vArr[2].y - vArr[0].y) + vArr[2].x * (vArr[0].y - vArr[1].y)) / 2
    );
    if (area < 0.01) {
      issues.push('Triangle has zero or near-zero area (degenerate/collinear vertices).');
    }

    // Pythagorean check: if one angle appears to be 90°
    const [a, b, c] = sides;
    const pythagoreanDiff = Math.abs(a * a + b * b - c * c);
    if (pythagoreanDiff < 0.5) {
      // This is a right triangle — verify the claimed hypotenuse answer if relevant
      const hypotenuse = c.toFixed(2);
      warnings.push(`Right triangle detected (sides ≈ ${a.toFixed(2)}, ${b.toFixed(2)}, ${hypotenuse}). Verify answer matches hypotenuse = ${hypotenuse}.`);
    }
  }

  return { verified: issues.length === 0, issues, warnings };
}

/**
 * Verify logarithm question: check base > 0, base != 1, valid argument.
 */
function verifyLogarithm(q: ValidatableQuestion): { verified: boolean | null; issues: string[] } {
  const issues: string[] = [];

  if (!q.mathExpression) return { verified: null, issues };

  // Match log_b(x) or log_{b}(x) or \log_{b}(x)
  const logMatch = q.mathExpression.match(/\\?log[_^]\{?(-?[\d.]+)\}?/);
  if (logMatch) {
    const base = parseFloat(logMatch[1]);
    if (isNaN(base)) {
      issues.push(`Cannot parse logarithm base from '${q.mathExpression}'.`);
    } else if (base <= 0) {
      issues.push(`Invalid logarithm base ${base}: must be > 0.`);
    } else if (Math.abs(base - 1) < 0.001) {
      issues.push(`Invalid logarithm base ${base}: base cannot equal 1.`);
    }
  }

  // Check for \log_0 explicitly
  if (/\\?log[_^]\{?0\}?/.test(q.mathExpression)) {
    issues.push('Invalid logarithm: base cannot be 0.');
  }

  return { verified: issues.length === 0 && logMatch !== null, issues };
}

/**
 * Verify arithmetic/geometric sequence: given first term, common diff/ratio, verify the nth term answer.
 * Supports forms in `given` array like "a1 = 3", "d = 2", "n = 10".
 */
function verifySequence(q: ValidatableQuestion): { verified: boolean | null; issues: string[] } {
  const issues: string[] = [];
  const given = q.given;
  if (!given || given.length === 0) return { verified: null, issues };

  // Parse given fields
  const parseGiven = (key: string): number | null => {
    for (const g of given) {
      const m = g.match(new RegExp(`${key}\\s*=\\s*(-?[\\d.]+)`));
      if (m) return parseFloat(m[1]);
    }
    return null;
  };

  const a1 = parseGiven('a1') ?? parseGiven('a_1') ?? parseGiven('a');
  const d = parseGiven('d');       // common difference
  const r = parseGiven('r');       // common ratio
  const n = parseGiven('n');

  if (a1 === null || n === null) return { verified: null, issues };

  let expectedAnswer: number | null = null;

  if (d !== null) {
    // Arithmetic: an = a1 + (n-1)*d
    expectedAnswer = a1 + (n - 1) * d;
  } else if (r !== null) {
    // Geometric: an = a1 * r^(n-1)
    expectedAnswer = a1 * Math.pow(r, n - 1);
  }

  if (expectedAnswer === null) return { verified: null, issues };

  // Find the correct option's numeric value
  const correctOpt = q.options?.find(o => o.id === q.correctAnswer);
  if (!correctOpt) return { verified: null, issues };

  const givenAnswer = extractNumericAnswer(correctOpt.text);
  if (givenAnswer === null) return { verified: null, issues };

  if (Math.abs(givenAnswer - expectedAnswer) > 0.01) {
    issues.push(
      `Sequence verification FAILED: expected a${n} = ${expectedAnswer.toFixed(2)}, but correctAnswer option = ${givenAnswer}.`
    );
    return { verified: false, issues };
  }

  return { verified: true, issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classify topic type for routing to correct verifier
// ─────────────────────────────────────────────────────────────────────────────
type TopicCategory = 'algebra' | 'geometry' | 'logarithm' | 'sequence' | 'function' | 'unknown';

function classifyTopic(topic: string, questionText: string): TopicCategory {
  const combined = (topic + ' ' + questionText).toLowerCase();

  if (/لوغاريتم|logarithm|log/.test(combined)) return 'logarithm';
  if (/هندس|مثلث|دائر|زاوي|محور|نقط|إحداثي|ضلع|وتر|مستطيل|مربع|geometry|triangle|circle/.test(combined)) return 'geometry';
  if (/متتالي|حسابي|هندسي|حد الأول|sequence|arithmetic|geometric/.test(combined)) return 'sequence';
  if (/دال|مجال|نطاق|function/.test(combined)) return 'function';
  if (/معادل|جبر|إكس|متغير|algebra|equation/.test(combined)) return 'algebra';

  // Also check for equation patterns in mathExpression as a fallback
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — Validate a single question
// ─────────────────────────────────────────────────────────────────────────────
export function validateQuestion(q: ValidatableQuestion): ValidationResult {
  const allIssues: string[] = [];
  const allWarnings: string[] = [];

  // Level 1: Structural
  const { isValid: structValid, issues: structIssues } = validateStructure(q);
  allIssues.push(...structIssues);

  if (!structValid) {
    return {
      status: 'INVALID',
      issues: allIssues,
      warnings: allWarnings,
    };
  }

  // Level 2: LaTeX Syntax
  const { issues: latexIssues, warnings: latexWarnings } = validateLatexSyntax(q);
  allIssues.push(...latexIssues);
  allWarnings.push(...latexWarnings);

  if (latexIssues.length > 0) {
    return { status: 'INVALID', issues: allIssues, warnings: allWarnings };
  }

  // At minimum, the question is structurally valid
  let status: ValidationStatus = 'STRUCTURALLY_VALID';

  // Level 3: Mathematical Consistency
  const topicType = classifyTopic(q.topic, q.questionText);

  if (topicType === 'geometry' && q.diagram) {
    const { verified, issues: geoIssues, warnings: geoWarnings } = verifyGeometry(q);
    allIssues.push(...geoIssues);
    allWarnings.push(...geoWarnings);
    if (verified === true) status = 'MATHEMATICALLY_VERIFIED';
    else if (verified === false) return { status: 'INVALID', issues: allIssues, warnings: allWarnings };
    else status = 'NEEDS_REVIEW';
  } else if (topicType === 'algebra' || topicType === 'unknown') {
    const { verified, issues: algIssues } = verifyAlgebra(q);
    allIssues.push(...algIssues);
    if (verified === true) status = 'MATHEMATICALLY_VERIFIED';
    else if (verified === false) return { status: 'INVALID', issues: allIssues, warnings: allWarnings };
    else status = 'NEEDS_REVIEW';
  } else if (topicType === 'logarithm') {
    const { verified, issues: logIssues } = verifyLogarithm(q);
    allIssues.push(...logIssues);
    if (verified === true) status = 'MATHEMATICALLY_VERIFIED';
    else if (verified === false) return { status: 'INVALID', issues: allIssues, warnings: allWarnings };
    else status = 'NEEDS_REVIEW';
  } else if (topicType === 'sequence') {
    const { verified, issues: seqIssues } = verifySequence(q);
    allIssues.push(...seqIssues);
    if (verified === true) status = 'MATHEMATICALLY_VERIFIED';
    else if (verified === false) return { status: 'INVALID', issues: allIssues, warnings: allWarnings };
    else status = 'NEEDS_REVIEW';
  } else {
    // function or unrecognized — can only confirm structural validity
    status = 'NEEDS_REVIEW';
    allWarnings.push('Question type could not be independently verified. Teacher review recommended.');
  }

  return { status, issues: allIssues, warnings: allWarnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API — Validate a batch (legacy compatible interface)
// ─────────────────────────────────────────────────────────────────────────────
export class ValidatorService {
  /**
   * Validates a batch of generated questions.
   * Each question receives a validationStatus field.
   * Questions with status INVALID are filtered out.
   * Questions with STRUCTURALLY_VALID, MATHEMATICALLY_VERIFIED, or NEEDS_REVIEW pass through.
   */
  static validateBatch(data: { questions: ValidatableQuestion[] }): { questions: ValidatableQuestion[] } {
    const results: ValidatableQuestion[] = [];

    for (const q of data.questions) {
      const result = validateQuestion(q);

      if (result.status === 'INVALID') {
        logger.warn(
          `[ValidatorService] REJECTED question "${q.questionText?.substring(0, 60)}". Issues: ${result.issues.join(' | ')}`
        );
        continue;
      }

      if (result.warnings.length > 0) {
        logger.warn(
          `[ValidatorService] Warnings for "${q.questionText?.substring(0, 60)}": ${result.warnings.join(' | ')}`
        );
      }

      if (result.status === 'MATHEMATICALLY_VERIFIED') {
        logger.info(`[ValidatorService] VERIFIED: "${q.questionText?.substring(0, 60)}"`);
      } else if (result.status === 'NEEDS_REVIEW') {
        logger.info(`[ValidatorService] NEEDS_REVIEW: "${q.questionText?.substring(0, 60)}"`);
      }

      // Attach the status to the question object
      results.push({ ...q, validationStatus: result.status });
    }

    return { questions: results };
  }
}
