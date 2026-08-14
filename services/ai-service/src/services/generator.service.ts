import { OpenRouterClient } from './openrouter.client.js';
import { z } from 'zod';

export const generatedQuestionsSchema = z.object({
  questions: z.array(z.object({
    text: z.string(),
    options: z.array(z.string()).length(4),
    correctAnswer: z.number().int().min(0).max(3)
  }))
});

export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>;

export class GeneratorService {
  static async generateMCQ(topic: string, difficulty: string, count: number): Promise<{ data: GeneratedQuestions, tokensUsed: number }> {
    const client = new OpenRouterClient();

    const systemPrompt = `أنت مساعد تعليمي خبير في الرياضيات للمناهج العربية.
مهمتك توليد أسئلة اختيار من متعدد (MCQ) لموضوع معين ومستوى صعوبة محدد.
يجب أن ترد بصيغة JSON فقط بدون أي نص إضافي.
كل سؤال يجب أن يحتوي على:
- "text": نص السؤال باللغة العربية. يجب أن يكون واضحاً وتعليمياً.
- "options": مصفوفة نصوص تحتوي على الخيارات (يجب أن تكون 4 خيارات بالضبط).
- "correctAnswer": رقم يمثل الفهرس الصحيح للإجابة في مصفوفة الخيارات (بين 0 و 3).

ملاحظات هامة جداً عن الرياضيات (LaTeX):
- استخدم الصيغة القياسية للرياضيات: \u005C( ... \u005C) للمعادلات داخل السطر و \u005C[ ... \u005C] للمعادلات المنفصلة.
- لا تستخدم شرطتين مائلتين (مثل \\\\( ) أبداً. استخدم شرطة مائلة واحدة فقط في المخرجات.
- إذا كنت تكتب مصفوفة، استخدم \u005Cbegin{bmatrix} و \u005Cend{bmatrix}.
- لا تكتب نصوص برمجية (JSON artifacts) أو وسوم داخل النصوص.
- يجب أن تكون المخرجات JSON صالحاً وقابلاً للقراءة بواسطة JSON.parse.

أعد الإجابة كـ JSON object يحتوي على مفتاح "questions" وقيمته مصفوفة الأسئلة.`;

    const userPrompt = `قم بتوليد ${count} أسئلة في موضوع "${topic}" بمستوى صعوبة "${difficulty}".

أعد الإجابة بصيغة JSON فقط بالشكل التالي:
{"questions": [{"text": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0}]}`;

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const result = await client.chatCompletion({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          response_format: { type: 'json_object' },
        });

        const text = result.choices?.[0]?.message?.content || '';
        const tokensUsed = result.usage?.total_tokens || 0;

        if (!text) throw new Error('No content from OpenRouter');

        let jsonString = text.trim();
        
        // Remove reasoning block if present
        if (jsonString.includes('</think>')) {
          jsonString = jsonString.split('</think>')[1].trim();
        }
        
        // Extract from markdown block if present
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonString = jsonMatch[1].trim();
        } else {
          // Fallback: try to find the outermost braces
          const braceMatch = jsonString.match(/\{[\s\S]*\}/);
          if (braceMatch) {
            jsonString = braceMatch[0];
          }
        }

        const parsed = JSON.parse(jsonString);
        const validated = generatedQuestionsSchema.parse(parsed);

        return { data: validated, tokensUsed };
      } catch (error) {
        console.warn(`[GeneratorService] Attempt ${attempts} failed:`, error);
        if (attempts >= 2) {
          throw new Error('Failed to generate valid JSON questions after retries.');
        }
      }
    }
    
    throw new Error('Unexpected error in generator');
  }
}
