/**
 * Quick integration test — tests only the generator + validator, no HTTP.
 * Run: npx tsx services/ai-service/quick-test.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { GeneratorService } from './src/services/generator.service.js';
import { ValidatorService } from './src/services/validator.service.js';

const TIMEOUT_MS = 45000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠ OPENROUTER_API_KEY not set. Skipping integration test.');
    return;
  }

  console.log('\n=== Quick Integration: Algebra (1 question) ===');
  try {
    const { data, tokensUsed } = await withTimeout(
      GeneratorService.generateMCQ('الجبر الخطي', 'سهل', 1),
      TIMEOUT_MS
    );
    const validated = ValidatorService.validateBatch(data);
    
    console.log(`Generated: ${data.questions.length}`);
    console.log(`After validation: ${validated.questions.length}`);
    console.log(`Tokens: ${tokensUsed}`);

    if (validated.questions.length > 0) {
      const q = validated.questions[0];
      console.log(`\nQuestion: "${q.questionText}"`);
      console.log(`Math: ${q.mathExpression}`);
      console.log(`Status: ${q.validationStatus}`);
      console.log(`Has generationLogic: ${!!q.generationLogic}`);
      console.log(`Has solutionExplanation: ${!!q.solutionExplanation}`);
      console.log(`generationLogic.questionDesign: ${q.generationLogic?.questionDesign?.substring(0, 80)}`);
      console.log(`solutionExplanation: ${q.solutionExplanation?.substring(0, 100)}`);
      console.log('\nOptions:');
      q.options?.forEach(o => {
        const isCorrect = o.id === q.correctAnswer;
        console.log(`  ${o.id}: ${o.text}${isCorrect ? ' ✓' : ''}`);
      });
    }
  } catch (err: any) {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
