/**
 * AI Generation + Validation Test Suite
 *
 * Tests the complete pipeline:
 *   GeneratorService → ValidatorService → results
 *
 * Run: npx tsx services/ai-service/test-ai.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { GeneratorService } from './src/services/generator.service.js';
import { ValidatorService, validateQuestion } from './src/services/validator.service.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const pass = (msg: string) => console.log(`${GREEN}✓ PASS${RESET} — ${msg}`);
const fail = (msg: string) => console.log(`${RED}✗ FAIL${RESET} — ${msg}`);
const info = (msg: string) => console.log(`${CYAN}ℹ${RESET}  ${msg}`);
const section = (title: string) => console.log(`\n${YELLOW}══ ${title} ══${RESET}`);

let passed = 0;
let failed = 0;

function assert(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) { pass(passMsg); passed++; }
  else { fail(failMsg); failed++; }
}

// ─── UNIT TESTS — Validator Logic (no API calls) ─────────────────────────────

section('LEVEL 1 — Structural Validation (Unit Tests)');

const structurallyValid = {
  type: 'multiple_choice',
  topic: 'جبر',
  difficulty: 'متوسط',
  questionText: 'ما قيمة x في: 2x + 5 = 17؟',
  mathExpression: '2x + 5 = 17',
  options: [
    { id: 'A', text: '4' },
    { id: 'B', text: '6' },
    { id: 'C', text: '8' },
    { id: 'D', text: '10' },
  ],
  correctAnswer: 'B',
  explanation: 'نطرح 5 ثم نقسم على 2',
  solutionSteps: ['2x = 12', 'x = 6'],
};

// Missing options
{
  const r = validateQuestion({ ...structurallyValid, options: undefined } as any);
  assert(r.status === 'INVALID', 'Missing options → INVALID', `Should be INVALID, got ${r.status}`);
}

// Wrong correctAnswer
{
  const r = validateQuestion({ ...structurallyValid, correctAnswer: 'E' });
  assert(r.status === 'INVALID', 'Invalid correctAnswer ref → INVALID', `Should be INVALID, got ${r.status}`);
}

// Duplicate options
{
  const r = validateQuestion({
    ...structurallyValid,
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '6' },   // duplicate
      { id: 'C', text: '8' },
      { id: 'D', text: '10' },
    ],
  });
  assert(r.status === 'INVALID', 'Duplicate options → INVALID', `Should be INVALID, got ${r.status}: ${r.issues.join(', ')}`);
}

section('LEVEL 2 — LaTeX Syntax (Unit Tests)');

// Unbalanced braces
{
  const r = validateQuestion({ ...structurallyValid, mathExpression: '\\frac{x+2{3}' });
  assert(r.status === 'INVALID', 'Unbalanced braces → INVALID', `Should be INVALID, got ${r.status}`);
}

// Forbidden LaTeX delimiters
{
  const r = validateQuestion({ ...structurallyValid, mathExpression: '\\(2x+5=17\\)' });
  assert(r.status === 'INVALID', 'Forbidden LaTeX delimiters → INVALID', `Should be INVALID, got ${r.status}`);
}

section('LEVEL 3 — Mathematical Verification (Unit Tests)');

// Correct linear equation (x=6 satisfies 2x+5=17)
{
  const r = validateQuestion(structurallyValid);
  assert(
    r.status === 'MATHEMATICALLY_VERIFIED',
    'Correct linear answer (x=6) → MATHEMATICALLY_VERIFIED',
    `Should be VERIFIED, got ${r.status}. Issues: ${r.issues.join(', ')}`
  );
}

// Wrong algebraic answer
{
  const r = validateQuestion({
    ...structurallyValid,
    options: [
      { id: 'A', text: '4' },
      { id: 'B', text: '5' },   // incorrect: 2(5)+5 = 15 ≠ 17
      { id: 'C', text: '8' },
      { id: 'D', text: '10' },
    ],
    correctAnswer: 'B',
  });
  assert(r.status === 'INVALID', 'Wrong algebraic answer → INVALID', `Should be INVALID, got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Logarithm: invalid base = 1
{
  const r = validateQuestion({
    ...structurallyValid,
    topic: 'لوغاريتم',
    mathExpression: '\\log_{1}(8) = ?',
  });
  assert(r.status === 'INVALID', 'log base 1 → INVALID', `Should be INVALID, got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Logarithm: invalid base = 0
{
  const r = validateQuestion({
    ...structurallyValid,
    topic: 'لوغاريتم',
    mathExpression: '\\log_{0}(8) = ?',
  });
  assert(r.status === 'INVALID', 'log base 0 → INVALID', `Should be INVALID, got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Valid logarithm
{
  const r = validateQuestion({
    ...structurallyValid,
    topic: 'لوغاريتم',
    mathExpression: '\\log_{2}(8) = 3',
  });
  assert(r.status !== 'INVALID', 'Valid log_2(8) → not INVALID', `Should NOT be INVALID, got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Geometry: valid triangle with correct distances
{
  const geoQ = {
    ...structurallyValid,
    topic: 'هندسة',
    mathExpression: null,
    diagram: {
      type: 'triangle',
      vertices: [
        { id: 'A', x: 0, y: 0, label: 'A' },
        { id: 'B', x: 3, y: 0, label: 'B' },
        { id: 'C', x: 0, y: 4, label: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B', label: '3' },
        { from: 'A', to: 'C', label: '4' },
        { from: 'B', to: 'C', label: '5' },
      ],
    },
  };
  const r = validateQuestion(geoQ);
  assert(r.status === 'MATHEMATICALLY_VERIFIED', 'Pythagorean (3,4,5) triangle → MATHEMATICALLY_VERIFIED', `Got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Geometry: wrong distance label
{
  const geoQ = {
    ...structurallyValid,
    topic: 'هندسة',
    mathExpression: null,
    diagram: {
      type: 'triangle',
      vertices: [
        { id: 'A', x: 0, y: 0, label: 'A' },
        { id: 'B', x: 3, y: 0, label: 'B' },
        { id: 'C', x: 0, y: 4, label: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B', label: '3' },
        { from: 'A', to: 'C', label: '4' },
        { from: 'B', to: 'C', label: '7' },  // WRONG: should be 5
      ],
    },
  };
  const r = validateQuestion(geoQ);
  assert(r.status === 'INVALID', 'Wrong geometry edge label → INVALID', `Got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Sequence: arithmetic an = a1 + (n-1)*d = 2 + (5-1)*3 = 14
{
  const seqQ = {
    ...structurallyValid,
    topic: 'متتاليات حسابية',
    mathExpression: null,
    given: ['a1 = 2', 'd = 3', 'n = 5'],
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '14' },  // correct
      { id: 'C', text: '16' },
      { id: 'D', text: '20' },
    ],
    correctAnswer: 'B',
  };
  const r = validateQuestion(seqQ);
  assert(r.status === 'MATHEMATICALLY_VERIFIED', 'Arithmetic sequence (correct) → VERIFIED', `Got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// Sequence: wrong answer
{
  const seqQ = {
    ...structurallyValid,
    topic: 'متتاليات حسابية',
    mathExpression: null,
    given: ['a1 = 2', 'd = 3', 'n = 5'],
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '12' },  // wrong: correct is 14
      { id: 'C', text: '16' },
      { id: 'D', text: '20' },
    ],
    correctAnswer: 'B',
  };
  const r = validateQuestion(seqQ);
  assert(r.status === 'INVALID', 'Arithmetic sequence (wrong answer) → INVALID', `Got ${r.status}. Issues: ${r.issues.join(', ')}`);
}

// ─── INTEGRATION TESTS — Real LLM Generation ─────────────────────────────────

async function runIntegrationTests() {
  section('INTEGRATION — Algebra Generation (3 questions)');
  try {
    const { data, tokensUsed } = await GeneratorService.generateMCQ('الجبر الخطي والمعادلات', 'متوسط', 3);
    const validated = ValidatorService.validateBatch(data);
    info(`Generated: ${data.questions.length}, After validation: ${validated.questions.length}, Tokens: ${tokensUsed}`);

    for (const q of validated.questions) {
      info(`  [${q.validationStatus}] ${q.questionText?.substring(0, 70)}`);
      assert(!!q.generationLogic, `Has generationLogic`, `Missing generationLogic in question: ${q.questionText?.substring(0, 40)}`);
      assert(!!q.solutionExplanation, `Has solutionExplanation`, `Missing solutionExplanation`);
      assert(!!q.validationStatus, `Has validationStatus`, `Missing validationStatus`);
    }
  } catch (err: any) {
    fail(`Algebra generation failed: ${err.message}`);
    failed++;
  }

  section('INTEGRATION — Geometry Generation (3 questions)');
  try {
    const { data, tokensUsed } = await GeneratorService.generateMCQ('الهندسة ونظرية فيثاغورس', 'سهل', 3);
    const validated = ValidatorService.validateBatch(data);
    info(`Generated: ${data.questions.length}, After validation: ${validated.questions.length}, Tokens: ${tokensUsed}`);
    for (const q of validated.questions) {
      info(`  [${q.validationStatus}] ${q.questionText?.substring(0, 70)}`);
    }
    assert(validated.questions.length > 0, 'At least 1 geometry question passed validation', 'All geometry questions were rejected');
  } catch (err: any) {
    fail(`Geometry generation failed: ${err.message}`);
    failed++;
  }

  section('INTEGRATION — Logarithm Generation (2 questions)');
  try {
    const { data, tokensUsed } = await GeneratorService.generateMCQ('اللوغاريتمات والأسس', 'متوسط', 2);
    const validated = ValidatorService.validateBatch(data);
    info(`Generated: ${data.questions.length}, After validation: ${validated.questions.length}, Tokens: ${tokensUsed}`);
    for (const q of validated.questions) {
      info(`  [${q.validationStatus}] ${q.questionText?.substring(0, 70)}`);
    }
    assert(validated.questions.length > 0, 'At least 1 logarithm question passed validation', 'All logarithm questions were rejected');
  } catch (err: any) {
    fail(`Logarithm generation failed: ${err.message}`);
    failed++;
  }

  section('INTEGRATION — Sequence Generation (2 questions)');
  try {
    const { data, tokensUsed } = await GeneratorService.generateMCQ('المتتاليات الحسابية والهندسية', 'متوسط', 2);
    const validated = ValidatorService.validateBatch(data);
    info(`Generated: ${data.questions.length}, After validation: ${validated.questions.length}, Tokens: ${tokensUsed}`);
    for (const q of validated.questions) {
      info(`  [${q.validationStatus}] ${q.questionText?.substring(0, 70)}`);
    }
    assert(validated.questions.length > 0, 'At least 1 sequence question passed validation', 'All sequence questions were rejected');
  } catch (err: any) {
    fail(`Sequence generation failed: ${err.message}`);
    failed++;
  }

  section('INTEGRATION — Regeneration Preserves Constraints');
  try {
    const context = { gradeLevel: 'الصف التاسع', subject: 'رياضيات', customInstructions: 'اجعل الأرقام بسيطة وصحيحة' };
    const { data } = await GeneratorService.generateMCQ('الجبر', 'سهل', 1, context);
    const { data: regen } = await GeneratorService.generateMCQ('الجبر', 'سهل', 1, context);

    const validated1 = ValidatorService.validateBatch(data);
    const validated2 = ValidatorService.validateBatch(regen);

    info(`Original: "${validated1.questions[0]?.questionText?.substring(0, 60)}"`);
    info(`Regenerated: "${validated2.questions[0]?.questionText?.substring(0, 60)}"`);

    assert(
      validated1.questions[0]?.questionText !== validated2.questions[0]?.questionText,
      'Regenerated question is different from original',
      'Regenerated question is identical (may be coincidence)'
    );
    assert(
      validated2.questions[0]?.difficulty === 'سهل',
      'Regenerated question preserves difficulty',
      `Difficulty mismatch: got ${validated2.questions[0]?.difficulty}`
    );
  } catch (err: any) {
    fail(`Regeneration test failed: ${err.message}`);
    failed++;
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log(`\n${YELLOW}⚠ Skipping LLM integration tests — OPENROUTER_API_KEY not set${RESET}`);
  } else {
    await runIntegrationTests();
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  section('TEST SUMMARY');
  console.log(`${GREEN}Passed: ${passed}${RESET}  |  ${RED}Failed: ${failed}${RESET}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
