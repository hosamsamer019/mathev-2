import { OpenRouterClient } from './openrouter.client.js';
import { db } from '../../../../packages/database/src/index.js';
import {
  solveDeterministically,
  repairAndParseJson,
  VerifiedMathSolution,
  MathStep
} from './math-solver-engine.js';

export class SolverService {
  static async solve(problem: string, level?: string): Promise<{ solution: string }> {
    // 1. Check deterministic algebraic engine first for ground truth & verified steps
    const verifiedSolution = solveDeterministically(problem);

    const systemPrompt = `You are an expert Math teacher. You must solve the math problem step-by-step in Arabic with clear mathematical reasoning.
You must return ONLY a valid JSON object matching this exact structure:
{
  "answer": "Summary of final answer with LaTeX formatting (e.g. \\( x = \\frac{1}{2} \\quad \\text{أو} \\quad x = -3 \\))",
  "steps": [
    {
      "step": 1,
      "title": "Title of step in Arabic (e.g. تحديد المعاملات وحساب المميز)",
      "content": "Clear Arabic explanation with LaTeX math like \\( \\Delta = b^2 - 4ac \\) or \\[ x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} \\]."
    }
  ]
}

CRITICAL RULES:
1. Provide between 3 and 5 concise, focused steps.
2. NEVER repeat calculations or create recursive fraction expansions.
3. Wrap all formulas in valid LaTeX delimiters: \\( ... \\) for inline, or \\[ ... \\] for display formulas.
4. Ensure double-escaped backslashes inside JSON strings (e.g. \\\\frac, \\\\sqrt, \\\\pm, \\\\Delta).
5. Output ONLY the JSON object. Do not wrap in markdown or add conversational filler.`;

    let userPrompt = `حل المسألة الرياضية التالية باللغة العربية خطوة بخطوة مع توضيح القوانين والتعويض بدقة:\nالمسألة: ${problem}`;

    if (level) {
      userPrompt += `\nالمستوى الدراسي: ${level}. يرجى تبسيط الشرح ليناسب هذا المستوى.`;
    }

    if (verifiedSolution?.groundTruthSummary) {
      userPrompt += `\n\n[VERIFIED MATHEMATICAL GROUND TRUTH]: ${verifiedSolution.groundTruthSummary}. Ensure your final answer and algebraic steps strictly match this verified result.`;
    }

    try {
      const client = new OpenRouterClient();
      const result = await client.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      });

      const text = result.choices?.[0]?.message?.content || '';
      if (text) {
        const parsed = repairAndParseJson(text);
        if (parsed && typeof parsed.answer === 'string' && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          // If we have verified deterministic roots, make sure the parsed answer isn't empty
          return { solution: JSON.stringify(parsed) };
        }
      }
    } catch (error: any) {
      console.warn('OpenRouter Solver API call failed or timed out:', error?.message || error);
    }

    // 2. If OpenRouter was offline, timed out, or returned invalid JSON:
    // Use the verified deterministic mathematical engine if available!
    if (verifiedSolution) {
      return {
        solution: JSON.stringify({
          answer: verifiedSolution.answer,
          steps: verifiedSolution.steps
        })
      };
    }

    // 3. Fallback clean structure (never expose raw JSON strings)
    return {
      solution: JSON.stringify({
        answer: 'تعذر الاتصال بخدمة الذكاء الاصطناعي لحل المسألة',
        steps: [
          {
            step: 1,
            title: 'تنبيه النظام',
            content: 'يرجى التأكد من كتابة المسألة بوضوح أو المحاولة مرة أخرى لاحقاً.'
          }
        ]
      })
    };
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
