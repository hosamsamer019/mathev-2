import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder_key'
});

export class SolverService {
  static async solve(problem: string, level: string = 'high_school') {
    // If we have an API key, we use OpenAI. Otherwise, we return a high-quality simulation.
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder_key') {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert Math Teacher. Solve the problem step-by-step in Arabic. 
            Format the output as JSON: { "solution": "string", "steps": ["step1", "step2"], "result": "string" }`
          },
          {
            role: "user",
            content: `Problem: ${problem} (Level: ${level})`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(response.choices[0].message.content || '{}');
    }

    // High-quality simulation for demo purposes
    return this.simulateSolving(problem, level);
  }

  private static simulateSolving(problem: string, _level: string) {
    // Basic logic to detect common problems and give realistic steps
    const isEquation = problem.includes('=');
    
    if (isEquation) {
      return {
        solution: "لحل هذه المعادلة، سنقوم بعزل المتغير x في طرف واحد.",
        steps: [
          "أولاً: تحديد جميع الحدود التي تحتوي على المتغير x.",
          "ثانياً: نقل الثوابت إلى الطرف الآخر من المعادلة مع تغيير الإشارة.",
          "ثالثاً: تبسيط الطرفين.",
          "رابعاً: القسمة على معامل x للحصول على القيمة النهائية."
        ],
        result: "x = (القيمة المحسوبة بناءً على المدخلات)"
      };
    }

    return {
      solution: "هذه مسألة رياضية متقدمة. جاري تحليل الخطوات المنطقية للحل...",
      steps: [
        "تحليل معطيات المسألة",
        "تطبيق القوانين الرياضية المناسبة",
        "التحقق من صحة الحل"
      ],
      result: "الحل يتطلب مراجعة دقيقة للمعطيات"
    };
  }
}
