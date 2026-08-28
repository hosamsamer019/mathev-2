import { OpenRouterClient } from './openrouter.client.js';
import { db } from '../../../../packages/database/src/index.js';

export class SolverService {
  static async solve(problem: string, level?: string): Promise<{ solution: string }> {
    const client = new OpenRouterClient();

    const systemPrompt = `You are an expert Math teacher. You must solve the math problem step-by-step in Arabic.
You must return a valid JSON object matching the following structure:
{
  "answer": "A summary of the final answer (e.g. قيمة س هي 5)",
  "steps": [
    {
      "step": 1,
      "title": "Title of the step in Arabic (e.g. الخطوة 1: تحليل المعادلة)",
      "content": "Detailed explanation of the step in Arabic. You can use LaTeX math formatting like \\( x^2 \\) or \\[ \\frac{a}{b} \\] mixed with Arabic text."
    }
  ]
}
Ensure all mathematical expressions are wrapped in proper LaTeX delimiters: \\( ... \\) for inline, or \\[ ... \\] for display math. Return ONLY valid JSON.`;

    let prompt = `أنت مدرس رياضيات خبير. قم بحل المسألة التالية بالتفصيل مع الشرح خطوة بخطوة باللغة العربية.\nالمسألة: ${problem}`;
    
    if (level) {
      prompt += `\nمستوى الطالب: ${level}. يرجى تبسيط الشرح ليناسب هذا المستوى.`;
    }

    try {
      const result = await client.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const text = result.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('No content returned from OpenRouter');

      try {
        const parsed = JSON.parse(text);
        if (parsed.answer && Array.isArray(parsed.steps)) {
          return { solution: JSON.stringify(parsed) };
        }
      } catch (err) {
        console.warn('Failed to parse AI JSON response, falling back:', err);
      }

      // Robust fallback formatting
      return {
        solution: JSON.stringify({
          answer: 'تم الحل (انظر التفاصيل أدناه)',
          steps: [
            {
              step: 1,
              title: 'خطوات الحل والشرح بالتفصيل',
              content: text
            }
          ]
        })
      };
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
