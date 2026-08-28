import { OpenRouterClient } from './openrouter.client.js';
import { ValidatorService, ValidationStatus, ValidatableQuestion } from './validator.service.js';
import { z } from 'zod';

// ─── Question Schema ──────────────────────────────────────────────────────────
export const questionItemSchema = z.object({
  id: z.string().optional(),
  type: z.string().default('multiple_choice'),
  subject: z.string().default('رياضيات'),
  topic: z.string(),
  subtopic: z.string().optional().nullable(),
  difficulty: z.string(),
  gradeLevel: z.string().default('المرحلة الثانوية'),
  questionText: z.string(),
  mathExpression: z.string().nullable().optional(),
  given: z.array(z.string()).optional().nullable(),
  required: z.string().optional().nullable(),
  diagram: z.any().nullable().optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).length(4),
  correctAnswer: z.string(),
  explanation: z.string(),
  solutionSteps: z.array(z.string()).default([]),
  solutionExplanation: z.string().optional().nullable(),
  generationLogic: z.any().optional().nullable(),
  validationStatus: z.enum(['MATHEMATICALLY_VERIFIED', 'STRUCTURALLY_VALID', 'NEEDS_REVIEW', 'INVALID']).optional(),
  points: z.number().default(1)
});

export const generatedQuestionsSchema = z.object({
  questions: z.array(questionItemSchema)
});

export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>;
export type GeneratedQuestionItem = z.infer<typeof questionItemSchema>;

// ─── Topic-Specific Rules ─────────────────────────────────────────────────────
function getTopicRules(topic: string): string {
  const t = topic.toLowerCase();

  if (/هندس|مثلث|دائر|زاوي|محيط|مساح|إحداثي|ضلع|وتر/.test(t)) {
    return `قواعد هندسة:
- إذا كان السؤال يحتاج رسمًا، ضع كائن diagram برؤوس (vertices) وأضلاع (edges) وإحداثيات دقيقة.
- فيثاغورس: a²+b²=c² بدقة تامة. أضلاع المثلث تحقق متراجحة المثلث.`;
  }

  if (/لوغاريتم|log/.test(t)) {
    return `قواعد لوغاريتمات:
- الأساس > 0 و != 1. المتغير > 0.
- مثال: log_2(8) = 3 لأن 2³ = 8.`;
  }

  if (/متتالي|حسابي|هندسي/.test(t)) {
    return `قواعد متتاليات:
- حدد الحد الأول (a1) والأساس (d للحسابية أو r للهندسية).
- الصيغة: a_n = a1 + (n-1)*d أو a_n = a1 * r^(n-1).`;
  }

  if (/دال|مجال|نطاق|function/.test(t)) {
    return `قواعد دوال:
- حدد المجال بدقة، وتأكد أن أي قيمة تعويض تنتمي للمجال.`;
  }

  return `قواعد جبر ومعادلات:
- تأكد أن الإجابة الصحيحة تحقق المعادلة بالتعويض المباشر، ولا تتكرر قيمة أي خيار.`;
}

// ─── Clean Prompt Builder ─────────────────────────────────────────────────────
function buildSystemPrompt(topic: string, difficulty: string, grade: string, subject: string): string {
  const topicRules = getTopicRules(topic);

  return `أنت خبير رياضيات للمناهج العربية.
مهمتك توليد سؤال اختيار من متعدد واحد (1) دقيق رياضياً بصيغة JSON فقط:
{
  "type": "multiple_choice",
  "subject": "${subject}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "gradeLevel": "${grade}",
  "questionText": "نص السؤال باللغة العربية فقط بدون رموز LaTeX",
  "mathExpression": "صيغة LaTeX الرياضية الخام إن وجدت (بدون $ أو \\( أو \\))",
  "options": [
    { "id": "A", "text": "الخيار الأول" },
    { "id": "B", "text": "الخيار الثاني" },
    { "id": "C", "text": "الخيار الثالث" },
    { "id": "D", "text": "الخيار الرابع" }
  ],
  "correctAnswer": "A",
  "explanation": "شرح رياضي موجز ومباشر لخطوات الحل",
  "solutionSteps": ["الخطوة الأولى", "الخطوة النهائية"],
  "points": 1
}

${topicRules}
قواعد أساسية:
1. الناتج JSON صالح 100% فقط بدون أي نصوص أو markdown خارجي.
2. 4 خيارات حصرية بالمعرفات A, B, C, D وقيم غير متطابقة.
3. correctAnswer حرف واحد من A/B/C/D.
4. للكسور \\frac{a}{b}، للأسس x^2، للجذور \\sqrt{x}.`;
}

// ─── Robust JSON Parser ───────────────────────────────────────────────────────
function extractAndParseJson(text: string): any {
  let cleanText = text.trim();

  // Strip reasoning blocks if any
  if (cleanText.includes('</think>')) {
    cleanText = cleanText.split('</think>')[1].trim();
  }

  // Strip markdown code blocks
  const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleanText = codeBlockMatch[1].trim();
  } else {
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
  }

  const parsed = JSON.parse(cleanText);

  // If wrapped in questions array, unpack the single question or return object
  if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    return parsed.questions[0];
  }

  return parsed;
}

// ─── Single Question Generator with Isolated Validation & Retry ──────────────
async function generateSingleQuestionWithRetry(
  client: OpenRouterClient,
  topic: string,
  difficulty: string,
  grade: string,
  subject: string,
  questionIndex: number,
  customInstructions?: string,
  maxAttempts = 3
): Promise<{ question: GeneratedQuestionItem; tokensUsed: number }> {
  const systemPrompt = buildSystemPrompt(topic, difficulty, grade, subject);
  const customNote = customInstructions ? `تعليمات المعلم: ${customInstructions}. ` : '';

  let totalTokens = 0;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const userPrompt = `قم بتوليد سؤال رياضيات مختلف ومميز رقم (${questionIndex}) في "${topic}" بمستوى "${difficulty}" للمرحلة "${grade}". ${customNote}JSON فقط.`;

      const boundedTemp = Math.min(0.5, 0.2 + ((questionIndex % 4) * 0.05) + ((attempt - 1) * 0.05));

      const response = await client.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: boundedTemp,
        max_tokens: 1800,
        response_format: { type: 'json_object' }
      });

      totalTokens += response.usage?.total_tokens || 0;
      const rawContent = response.choices?.[0]?.message?.content || (response.choices?.[0] as any)?.text || '';
      if (!rawContent || rawContent.trim() === '') {
        throw new Error('Empty response from AI model');
      }

      const parsedRaw = extractAndParseJson(rawContent);

      // Normalize options if returned as string array
      if (Array.isArray(parsedRaw.options) && parsedRaw.options.length === 4 && typeof parsedRaw.options[0] === 'string') {
        parsedRaw.options = parsedRaw.options.map((opt: string, idx: number) => ({
          id: ['A', 'B', 'C', 'D'][idx],
          text: String(opt)
        }));
      }

      if (typeof parsedRaw.correctAnswer === 'number') {
        parsedRaw.correctAnswer = ['A', 'B', 'C', 'D'][parsedRaw.correctAnswer] || 'A';
      }

      parsedRaw.topic = parsedRaw.topic || topic;
      parsedRaw.difficulty = parsedRaw.difficulty || difficulty;
      parsedRaw.gradeLevel = parsedRaw.gradeLevel || grade;
      parsedRaw.subject = parsedRaw.subject || subject;

      // Validate structure with Zod
      const structuredQ = questionItemSchema.parse(parsedRaw);

      // Perform mathematical validation with ValidatorService
      const validationResult = ValidatorService.validateSingle(structuredQ);

      if (validationResult.status === 'INVALID') {
        console.warn(`[GeneratorService] Question #${questionIndex} attempt ${attempt} INVALID: ${validationResult.issues.join(', ')}. Retrying...`);
        lastError = new Error(`Validation failed: ${validationResult.issues.join(', ')}`);
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      structuredQ.validationStatus = validationResult.status;
      return { question: structuredQ, tokensUsed: totalTokens };
    } catch (err: any) {
      console.warn(`[GeneratorService] Question #${questionIndex} attempt ${attempt} error: ${err.message}`);
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 300 * attempt));
      }
    }
  }

  throw lastError || new Error(`Failed to generate valid question #${questionIndex}`);
}

// ─── Controlled Concurrency Worker Pool ───────────────────────────────────────
async function runParallelGeneration<T>(
  tasks: (() => Promise<T>)[],
  concurrencyLimit = 5
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      try {
        results[index] = await tasks[index]();
      } catch (err: any) {
        console.error(`[GeneratorService] Task at index ${index} failed:`, err.message);
        results[index] = null;
      }
    }
  }

  const workerCount = Math.min(concurrencyLimit, tasks.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}

// ─── Public Generator Service ─────────────────────────────────────────────────
export class GeneratorService {
  /**
   * Generates multiple MCQs using controlled parallel workers.
   * Concurrency is capped at 5 for maximum throughput without exceeding rate limits.
   */
  static async generateMCQ(
    topic: string,
    difficulty: string,
    count: number,
    extraContext?: {
      gradeLevel?: string;
      subject?: string;
      subtopic?: string;
      customInstructions?: string;
    }
  ): Promise<{ data: GeneratedQuestions; tokensUsed: number }> {
    const client = new OpenRouterClient();
    const grade = extraContext?.gradeLevel || 'الصف الأول الثانوي';
    const subject = extraContext?.subject || 'رياضيات';
    const customInstructions = extraContext?.customInstructions;

    console.log(`[GeneratorService] Starting parallel generation of ${count} questions (Concurrency: 5)...`);
    const tStart = performance.now();

    // Create tasks for each question index
    const tasks = Array.from({ length: count }, (_, i) => {
      const questionIndex = i + 1;
      return () => generateSingleQuestionWithRetry(
        client,
        topic,
        difficulty,
        grade,
        subject,
        questionIndex,
        customInstructions
      );
    });

    // Execute with controlled worker pool (max concurrency = 5)
    const taskResults = await runParallelGeneration(tasks, 5);

    const questions: GeneratedQuestionItem[] = [];
    let totalTokensUsed = 0;

    for (const res of taskResults) {
      if (res?.question) {
        questions.push(res.question);
        totalTokensUsed += res.tokensUsed || 0;
      }
    }

    // If any question failed, attempt one final repair pass for missing slots
    if (questions.length < count) {
      const missingCount = count - questions.length;
      console.warn(`[GeneratorService] Attempting recovery for ${missingCount} missing question(s)...`);
      for (let m = 0; m < missingCount; m++) {
        try {
          const recovered = await generateSingleQuestionWithRetry(
            client,
            topic,
            difficulty,
            grade,
            subject,
            questions.length + 1,
            customInstructions
          );
          if (recovered?.question) {
            questions.push(recovered.question);
            totalTokensUsed += recovered.tokensUsed || 0;
          }
        } catch {
          // ignore recovery error
        }
      }
    }

    const duration = Math.round(performance.now() - tStart);
    console.log(`[GeneratorService] Finished ${questions.length}/${count} questions in ${duration}ms (${(duration / 1000).toFixed(2)}s)`);

    if (questions.length === 0) {
      throw new Error('Failed to generate any valid questions');
    }

    return {
      data: { questions },
      tokensUsed: totalTokensUsed
    };
  }
}
