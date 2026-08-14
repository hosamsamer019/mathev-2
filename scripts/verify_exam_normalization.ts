/**
 * API-level verification of exam normalization.
 * Tests the normalization logic directly against real DB data without a browser.
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: 'packages/database/.env' });

const prisma = new PrismaClient();

// === Inline the normalization logic for verification ===
interface NormalizedQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  type: string;
  explanation?: string;
}

function normalizeExamQuestions(rawQuestions: any, examId: string): NormalizedQuestion[] {
  if (!rawQuestions) return [];

  let arr: any[] = [];
  if (Array.isArray(rawQuestions)) {
    arr = rawQuestions;
  } else if (typeof rawQuestions === 'object') {
    if (Array.isArray(rawQuestions.create)) {
      console.log(`  [INFO] Exam ${examId}: Detected { create: [...] } wrapper, extracting array.`);
      arr = rawQuestions.create;
    } else if (Array.isArray(rawQuestions.data)) {
      arr = rawQuestions.data;
    } else {
      console.error(`[EXAM DATA ERROR] Malformed questions object for exam ${examId}:`, JSON.stringify(rawQuestions));
      throw new Error(`Malformed questions object for exam ${examId}`);
    }
  } else if (typeof rawQuestions === 'string') {
    try {
      const parsed = JSON.parse(rawQuestions);
      return normalizeExamQuestions(parsed, examId);
    } catch {
      throw new Error(`Invalid JSON string for exam ${examId}`);
    }
  } else {
    throw new Error(`Unrecognized questions format for exam ${examId}`);
  }

  const normalized: NormalizedQuestion[] = [];

  for (let i = 0; i < arr.length; i++) {
    const q = arr[i];
    const text = q.text || q.questionText || q.content || '';

    let options: string[] = [];
    if (Array.isArray(q.options)) {
      options = q.options.map((o: any) => String(o));
    } else if (typeof q.options === 'string') {
      options = q.options.split('-').map((s: string) => s.trim());
    } else if (typeof q.options === 'object' && q.options !== null) {
      options = Object.values(q.options).map((o: any) => String(o));
    }

    let correctAnswer = 0;
    if (typeof q.correct === 'number') correctAnswer = q.correct;
    else if (typeof q.correctAnswer === 'number') correctAnswer = q.correctAnswer;
    else if (typeof q.correct === 'string') {
      const idx = options.findIndex(o => o === q.correct);
      correctAnswer = idx >= 0 ? idx : parseInt(q.correct) || 0;
    } else if (typeof q.correctAnswer === 'string') {
      const idx = options.findIndex(o => o === q.correctAnswer);
      correctAnswer = idx >= 0 ? idx : parseInt(q.correctAnswer) || 0;
    }

    if (!text || text.trim() === '') {
      console.error(`[EXAM DATA ERROR] Question ${i} missing text in exam ${examId}:`, JSON.stringify(q));
      throw new Error(`Question ${i} is missing text in exam ${examId}`);
    }
    if (options.length < 2) {
      console.error(`[EXAM DATA ERROR] Question ${i} has only ${options.length} option(s) in exam ${examId}:`, JSON.stringify(q));
      throw new Error(`Question ${i} has insufficient options in exam ${examId}`);
    }
    if (options.length !== 4) {
      console.warn(`[EXAM DATA WARNING] Question ${i} has ${options.length} options (expected 4) in exam ${examId}. Rendering with available options.`);
    }

    normalized.push({
      id: q.id ? String(q.id) : `q-${i}`,
      text,
      options,
      correctAnswer,
      type: q.type || 'MCQ',
      explanation: q.explanation || ''
    });
  }

  return normalized;
}

// === LaTeX normalization (mirrors MathContent.tsx) ===
function normalizeLatex(text: string): string {
  if (typeof text !== 'string') return '';
  let t = text;
  t = t.replace(/\\\\\(/g, '\\(').replace(/\\\\\)/g, '\\)');
  t = t.replace(/\\\\\[/g, '\\[').replace(/\\\\\]/g, '\\]');
  t = t.replace(/\\\\\\\\/g, '\\\\');
  return t;
}

async function main() {
  console.log('\n===========================================');
  console.log('  EXAM NORMALIZATION VERIFICATION SCRIPT  ');
  console.log('===========================================\n');

  const exams = await prisma.exam.findMany({
    select: { id: true, title: true, questions: true, duration: true }
  });

  console.log(`Found ${exams.length} exams to verify.\n`);

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const exam of exams) {
    process.stdout.write(`  ▶ Exam "${exam.title}" (${exam.id.slice(0, 8)}...)  `);
    
    if (!exam.questions) {
      console.log('SKIP (no questions)');
      continue;
    }

    try {
      const normalized = normalizeExamQuestions(exam.questions, exam.id);
      
      // Verify each question's text is non-empty and options are clean
      let questionIssues = 0;
      for (const q of normalized) {
        if (!q.text.trim()) questionIssues++;
        if (q.options.some(o => !o.trim())) questionIssues++;
        if (q.correctAnswer < 0 || q.correctAnswer > 3) questionIssues++;
        
        // Verify LaTeX normalization doesn't destroy the content
        const normalizedText = normalizeLatex(q.text);
        // Check no double-escaped delimiters remain
        if (normalizedText.includes('\\\\(') || normalizedText.includes('\\\\[')) {
          console.warn(`\n    [WARN] Double-escaped LaTeX still present after normalization in question: "${q.text.slice(0, 50)}"`);
          questionIssues++;
        }
      }

      if (questionIssues > 0) {
        console.log(`⚠️  ${normalized.length} questions — ${questionIssues} issues`);
        failures.push(`  - ${exam.title}: ${questionIssues} question-level issues`);
        failed++;
      } else {
        console.log(`✅ ${normalized.length} questions — all clean`);
        // Print first question text snippet for human review
        if (normalized.length > 0) {
          const snippet = normalizeLatex(normalized[0].text).slice(0, 80);
          console.log(`     Q1 preview: "${snippet}"`);
          console.log(`     Options: [${normalized[0].options.slice(0, 2).join(', ')}...]`);
          console.log(`     CorrectAnswer index: ${normalized[0].correctAnswer}`);
        }
        passed++;
      }
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
      failures.push(`  - ${exam.title}: ${err.message}`);
      failed++;
    }
    console.log();
  }

  console.log('===========================================');
  console.log(`  RESULT: ${passed} PASS / ${failed} FAIL out of ${exams.length} exams`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(f));
  }
  console.log('===========================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
