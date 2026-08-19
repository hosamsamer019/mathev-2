import { OpenRouterClient } from './openrouter.client.js';
import { z } from 'zod';

// ─── Generation Logic Schema ──────────────────────────────────────────────────
const generationLogicSchema = z.object({
  questionDesign: z.string(),
  mathematicalMethod: z.string(),
  difficultyReason: z.string(),
  learningObjective: z.string(),
});

// ─── Full Question Schema ─────────────────────────────────────────────────────
export const generatedQuestionsSchema = z.object({
  questions: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    subject: z.string(),
    topic: z.string(),
    subtopic: z.string().optional(),
    difficulty: z.string(),
    gradeLevel: z.string(),
    questionText: z.string(),
    mathExpression: z.string().nullable(),
    given: z.array(z.string()).optional().nullable(),
    required: z.string().optional().nullable(),
    diagram: z.any().nullable(),
    options: z.array(z.object({
      id: z.string(),
      text: z.string()
    })).length(4).optional(),
    correctAnswer: z.string(),
    explanation: z.string(),
    solutionSteps: z.array(z.string()),
    solutionExplanation: z.string().optional().nullable(),
    generationLogic: generationLogicSchema.optional().nullable(),
    points: z.number().default(1)
  }))
});

export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>;

// ─── Topic-Aware Prompt Rules ─────────────────────────────────────────────────
function getTopicRules(topic: string): string {
  const t = topic.toLowerCase();

  if (/هندس|مثلث|دائر|زاوي|محيط|مساح|إحداثي|ضلع|وتر/.test(t)) {
    return `
قواعد خاصة بالهندسة:
- يجب تضمين كائن diagram بالرؤوس (vertices) والحواف (edges) إذا كانت الهندسة تحتاج رسمًا.
- يجب أن تكون الإحداثيات منطقية وتُنتج شكلاً هندسيًا حقيقيًا (لا نقاط متراكبة).
- أضلاع المثلث يجب أن تحقق متراجحة المثلث.
- إذا كان المثلث قائم الزاوية (نظرية فيثاغورس)، فيجب أن يكون a²+b²=c² صحيحًا بدقة.
- تسميات الأضلاع في labels يجب أن تطابق الأطوال الحقيقية المحسوبة من الإحداثيات.
- لا تستخدم صورًا افتراضية غير قابلة للتحقق.`;
  }

  if (/لوغاريتم|log/.test(t)) {
    return `
قواعد خاصة باللوغاريتمات:
- الأساس يجب أن يكون أكبر من 0 وليس 1 (لا يوجد log_0 أو log_1).
- المتغير (الحجة) يجب أن يكون أكبر من 0.
- يجب أن تعطي أعداد القيم صحيحة وواضحة للطالب.
- مثال صحيح: log_2(8) = 3 (لأن 2³ = 8).
- لا تستخدم أساسًا غير موجود أو قيمًا سالبة في الحجة.`;
  }

  if (/متتالي|حسابي|هندسي/.test(t)) {
    return `
قواعد خاصة بالمتتاليات:
- أذكر بوضوح: الحد الأول (a1)، الأساس المشترك (d) للحسابية أو النسبة الأساسية (r) للهندسية.
- الحد المطلوب (n) يجب أن يكون صحيحًا موجبًا.
- الإجابة الصحيحة يجب أن تتوافق مع الصيغة: a_n = a1 + (n-1)*d أو a_n = a1 * r^(n-1).
- اجعل الأعداد بسيطة وإجابتها صحيحة.`;
  }

  if (/دال|مجال|نطاق|function/.test(t)) {
    return `
قواعد خاصة بالدوال:
- حدد المجال والمدى بوضوح إذا كانا محدودين.
- أي قيمة تعويض يجب أن تكون في مجال الدالة.
- الإجابة يجب أن تتوافق مع قيمة الدالة الحقيقية عند النقطة المحددة.`;
  }

  // Default: algebra / arithmetic
  return `
قواعد خاصة بالجبر والمعادلات:
- إذا كانت المعادلة خطية (مثل: 2x + 5 = 17) فالإجابة يجب أن تُحقق المعادلة بالتعويض.
- لا تستخدم معادلات ذات أكثر من حل واحد إلا إذا أشرت إلى ذلك صراحةً.
- تحقق أن الإجابة الصحيحة ليست نفس قيمة أي خيار آخر من حيث القيمة العددية.`;
}

// ─── Difficulty Rules ─────────────────────────────────────────────────────────
function getDifficultyRules(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (/سهل|easy/.test(d)) {
    return 'الصعوبة: سهل — السؤال يتطلب تطبيق خطوة واحدة مباشرة أو معرفة نظرية واحدة.';
  }
  if (/صع|hard/.test(d)) {
    return 'الصعوبة: صعب — يتطلب دمج عدة مفاهيم أو تحويلات متعددة أو استنتاجات غير مباشرة.';
  }
  return 'الصعوبة: متوسط — يتطلب خطوتين أو أكثر من التفكير المنطقي المتسلسل.';
}

// ─── Generator Service ────────────────────────────────────────────────────────
export class GeneratorService {
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
    const topicRules = getTopicRules(topic);
    const difficultyRules = getDifficultyRules(difficulty);
    const grade = extraContext?.gradeLevel || 'المستوى المناسب للموضوع';
    const subject = extraContext?.subject || 'رياضيات';
    const customNote = extraContext?.customInstructions ? `\nتعليمات إضافية من المعلم: ${extraContext.customInstructions}` : '';

    const systemPrompt = `أنت مؤلف أسئلة رياضيات متخصص ومحترف للمناهج العربية.
مهمتك توليد ${count} أسئلة في موضوع "${topic}" (${subject}) بمستوى صعوبة "${difficulty}" للمرحلة: ${grade}.

الأسئلة يجب أن تكون دقيقة رياضياً وقابلة للتحقق المستقل.
يجب أن تعيد الإجابة بصيغة JSON فقط — كائن يحتوي على مصفوفة "questions" — بدون أي نص قبله أو بعده.

كل سؤال يجب أن يتبع هذا المخطط بالضبط:
{
  "type": "multiple_choice",
  "subject": "${subject}",
  "topic": "${topic}",
  "subtopic": "الموضوع الفرعي إن وجد",
  "difficulty": "${difficulty}",
  "gradeLevel": "${grade}",
  "questionText": "نص السؤال باللغة العربية فقط — بدون أي معادلات LaTeX داخله",
  "mathExpression": "التعبير الرياضي الرئيسي بصيغة LaTeX الخام (بدون \\( أو \\) أو $$ أو \\[ أو \\])",
  "given": ["المعطى الأول", "المعطى الثاني"],
  "required": "ما هو المطلوب إيجاده بوضوح",
  "diagram": null,
  "options": [
    { "id": "A", "text": "الخيار الأول" },
    { "id": "B", "text": "الخيار الثاني" },
    { "id": "C", "text": "الخيار الثالث" },
    { "id": "D", "text": "الخيار الرابع" }
  ],
  "correctAnswer": "A",
  "explanation": "شرح موجز لطريقة الحل",
  "solutionExplanation": "شرح تربوي واضح لطريقة الحل خطوة بخطوة بالعربية. هذا ليس تفكيرًا خفيًا — هو شرح يُقرأه المعلم والطالب.",
  "solutionSteps": [
    "الخطوة الأولى بصيغة LaTeX الخام",
    "الخطوة الثانية",
    "الخطوة النهائية"
  ],
  "generationLogic": {
    "questionDesign": "لماذا تم تصميم السؤال بهذه الطريقة؟ (من منظور تربوي)",
    "mathematicalMethod": "ما هي المهارة أو النظرية الرياضية التي يتوقع من الطالب تطبيقها؟",
    "difficultyReason": "لماذا هذا السؤال بمستوى ${difficulty}؟",
    "learningObjective": "الهدف التعليمي المحدد الذي يقيسه السؤال"
  },
  "points": 1
}

${difficultyRules}
${topicRules}

قواعد هامة جداً للجميع:
1. لا تستخدم \\( أو \\) أو \\[ أو \\] أو $$ في أي حقل. اكتب تعبيرات LaTeX خالصة مباشرة.
2. للكسور: \\frac{البسط}{المقام} — مثال: \\frac{x+2}{3}
3. للأسس: x^{2} أو x^2
4. للجذور: \\sqrt{25} أو \\sqrt[3]{8}
5. يجب أن يكون هناك 4 خيارات بالضبط بالمعرفات A, B, C, D.
6. correctAnswer يجب أن يكون حرفًا من A/B/C/D موجودًا في الخيارات.
7. لا يجوز أن يكون خياران لهما نفس القيمة العددية.
8. generationLogic هو تفسير تربوي موجز للمعلم — لا يحتوي على تفكير خفي داخلي.
9. solutionExplanation هو شرح الحل الرياضي — يختلف عن generationLogic.
10. لا تضع أي نص توضيحي قبل JSON أو بعده.${customNote}`;

    const userPrompt = `قم بتوليد ${count} سؤال في موضوع "${topic}" بمستوى "${difficulty}". 
يجب أن يكون الناتج كائن JSON صالح بنسبة 100%، يبدأ بـ { وينتهي بـ }.`;

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const result = await client.chatCompletion({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });

        const text = result.choices?.[0]?.message?.content || '';
        const tokensUsed = result.usage?.total_tokens || 0;

        if (!text) throw new Error('No content from OpenRouter');

        let jsonString = text.trim();

        // Strip <think>...</think> blocks from reasoning models
        if (jsonString.includes('</think>')) {
          jsonString = jsonString.split('</think>')[1].trim();
        }

        // Strip markdown code fences
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonString = jsonMatch[1].trim();
        } else {
          const braceMatch = jsonString.match(/\{[\s\S]*\}/);
          if (braceMatch) jsonString = braceMatch[0];
        }

        const parsed = JSON.parse(jsonString);

        // Normalize options format if LLM returns strings instead of objects
        if (parsed.questions && Array.isArray(parsed.questions)) {
          parsed.questions = parsed.questions.map((q: any) => {
            if (q.options && Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'string') {
              q.options = q.options.map((opt: string, i: number) => ({
                id: ['A', 'B', 'C', 'D'][i],
                text: opt
              }));
            }
            if (typeof q.correctAnswer === 'number') {
              q.correctAnswer = ['A', 'B', 'C', 'D'][q.correctAnswer];
            }
            return q;
          });
        }

        const validated = generatedQuestionsSchema.parse(parsed);
        return { data: validated, tokensUsed };
      } catch (error) {
        console.warn(`[GeneratorService] Attempt ${attempts} failed:`, error);
        if (attempts >= 3) {
          throw new Error('Failed to generate valid JSON questions after 3 attempts.');
        }
      }
    }

    throw new Error('Unexpected error in GeneratorService');
  }
}
