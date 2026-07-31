import { GoogleGenerativeAI } from '@google/generative-ai';

const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'placeholder_key' || key === '') {
    throw new Error('500 Internal Server Error: GEMINI_API_KEY is missing');
  }
  return new GoogleGenerativeAI(key);
};

export class SolverService {
  static async solve(problem: string, level?: string): Promise<{ solution: string }> {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `أنت مدرس رياضيات خبير. قم بحل المسألة التالية بالتفصيل مع الشرح خطوة بخطوة باللغة العربية.\nالمسألة: ${problem}`;
    
    if (level) {
      prompt += `\nمستوى الطالب: ${level}. يرجى تبسيط الشرح ليناسب هذا المستوى.`;
    }

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return { solution: text };
    } catch (error: any) {
      console.error('Gemini Solver Error:', error);
      throw new Error('Failed to solve math problem');
    }
  }
}
