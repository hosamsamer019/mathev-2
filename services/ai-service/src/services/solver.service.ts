import { OpenRouterClient } from './openrouter.client.js';
import { db } from '@smartmath/database';

export class SolverService {
  static async solve(problem: string, level?: string): Promise<{ solution: string }> {
    const client = new OpenRouterClient();

    let prompt = `أنت مدرس رياضيات خبير. قم بحل المسألة التالية بالتفصيل مع الشرح خطوة بخطوة باللغة العربية.\nالمسألة: ${problem}`;
    
    if (level) {
      prompt += `\nمستوى الطالب: ${level}. يرجى تبسيط الشرح ليناسب هذا المستوى.`;
    }

    try {
      const result = await client.chatCompletion({
        messages: [
          { role: 'system', content: 'أنت مدرس رياضيات خبير. تحل المسائل بالتفصيل خطوة بخطوة باللغة العربية.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      const text = result.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('No content returned from OpenRouter');

      return { solution: text };
    } catch (error: any) {
      console.error('OpenRouter Solver Error:', error.message);
      throw new Error('Failed to solve math problem');
    }
  }
  static async getHistory(studentId: string) {
    return (db as any).savedMathSolution.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async saveSolution(studentId: string, problem: string, solution: any) {
    return (db as any).savedMathSolution.create({
      data: {
        studentId,
        problem,
        solution
      }
    });
  }
}
