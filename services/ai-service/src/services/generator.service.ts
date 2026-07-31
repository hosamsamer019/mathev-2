import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';

const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'placeholder_key' || key === '') {
    throw new Error('500 Internal Server Error: GEMINI_API_KEY is missing');
  }
  return new GoogleGenerativeAI(key);
};

export const generatedQuestionsSchema = z.object({
  questions: z.array(z.object({
    text: z.string(),
    options: z.array(z.string()).min(2),
    correctAnswer: z.number().int().min(0)
  }))
});

export type GeneratedQuestions = z.infer<typeof generatedQuestionsSchema>;

export class GeneratorService {
  static async generateMCQ(topic: string, difficulty: string, count: number): Promise<{ data: GeneratedQuestions, tokensUsed: number }> {
    const genAI = getGeminiClient();

    const systemPrompt = `أنت مساعد تعليمي خبير في الرياضيات للمناهج العربية.
مهمتك توليد أسئلة اختيار من متعدد (MCQ) لموضوع معين ومستوى صعوبة محدد.
كل سؤال يجب أن يحتوي على:
- "text": نص السؤال باللغة العربية
- "options": مصفوفة نصوص تحتوي على الخيارات (يجب أن تكون 4 خيارات عادةً)
- "correctAnswer": رقم يمثل الفهرس الصحيح للإجابة في مصفوفة الخيارات (يبدأ من 0)`;

    const userPrompt = `قم بتوليد ${count} أسئلة في موضوع "${topic}" بمستوى صعوبة "${difficulty}".`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            questions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  text: { type: SchemaType.STRING, description: "نص السؤال" },
                  options: { 
                    type: SchemaType.ARRAY, 
                    items: { type: SchemaType.STRING },
                    description: "الخيارات الأربعة"
                  },
                  correctAnswer: { type: SchemaType.INTEGER, description: "الفهرس الصحيح للإجابة من 0" },
                },
                required: ['text', 'options', 'correctAnswer'],
              }
            }
          },
          required: ['questions']
        }
      }
    });

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const result = await model.generateContent(userPrompt);
        const text = result.response.text();
        const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

        if (!text) throw new Error('No content from Gemini');

        let jsonString = text.trim();
        // Remove markdown formatting if Gemini wrapped it
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
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
