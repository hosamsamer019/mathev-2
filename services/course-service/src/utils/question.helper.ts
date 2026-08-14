import { v4 as uuidv4 } from 'uuid';

export interface NormalizedQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  type: string;
  explanation?: string;
}

export function normalizeExamQuestions(rawQuestions: any, examId: string): NormalizedQuestion[] {
  if (!rawQuestions) return [];

  let arr: any[] = [];
  if (Array.isArray(rawQuestions)) {
    arr = rawQuestions;
  } else if (typeof rawQuestions === 'object') {
    if (Array.isArray(rawQuestions.create)) {
      arr = rawQuestions.create;
    } else if (Array.isArray(rawQuestions.data)) {
      arr = rawQuestions.data;
    } else {
      console.error(`[EXAM DATA ERROR] Malformed questions object for exam ${examId}:`, JSON.stringify(rawQuestions));
      throw new Error(`Malformed questions object for exam ${examId}`);
    }
  } else if (typeof rawQuestions === 'string') {
    try {
      const parsed = JSON.parse(rawQuestions);
      return normalizeExamQuestions(parsed, examId);
    } catch {
      console.error(`[EXAM DATA ERROR] Invalid JSON string for exam ${examId}:`, rawQuestions);
      throw new Error(`Invalid JSON string for exam ${examId}`);
    }
  } else {
    console.error(`[EXAM DATA ERROR] Unrecognized questions format for exam ${examId}:`, typeof rawQuestions);
    throw new Error(`Unrecognized questions format for exam ${examId}`);
  }

  const normalized: NormalizedQuestion[] = [];

  for (let i = 0; i < arr.length; i++) {
    const q = arr[i];
    
    // Normalize text
    const text = q.text || q.questionText || q.content || '';
    
    // Normalize options
    let options: string[] = [];
    if (Array.isArray(q.options)) {
      options = q.options.map((o: any) => String(o));
    } else if (typeof q.options === 'string') {
      options = q.options.split('-').map((s: string) => s.trim());
    } else if (typeof q.options === 'object' && q.options !== null) {
      options = Object.values(q.options).map((o: any) => String(o));
    }

    // Determine correct answer index
    let correctAnswer = 0;
    if (typeof q.correct === 'number') {
      correctAnswer = q.correct;
    } else if (typeof q.correctAnswer === 'number') {
      correctAnswer = q.correctAnswer;
    } else if (typeof q.correct === 'string') {
      // Sometimes it's the actual text, try to find index
      const idx = options.findIndex(o => o === q.correct);
      correctAnswer = idx >= 0 ? idx : parseInt(q.correct) || 0;
    } else if (typeof q.correctAnswer === 'string') {
      const idx = options.findIndex(o => o === q.correctAnswer);
      correctAnswer = idx >= 0 ? idx : parseInt(q.correctAnswer) || 0;
    }

    if (!text || text.trim() === '') {
      console.error(`[EXAM DATA ERROR] Question ${i} missing text in exam ${examId}:`, JSON.stringify(q));
      throw new Error(`Question ${i} is missing text in exam ${examId}`);
    }
    if (options.length < 2) {
      console.error(`[EXAM DATA ERROR] Question ${i} has only ${options.length} option(s) in exam ${examId}:`, JSON.stringify(q));
      throw new Error(`Question ${i} has insufficient options in exam ${examId}`);
    }
    if (options.length !== 4) {
      console.warn(`[EXAM DATA WARNING] Question ${i} has ${options.length} options (expected 4) in exam ${examId}. Rendering with available options.`);
    }

    normalized.push({
      id: q.id ? String(q.id) : uuidv4(),
      text,
      options,
      correctAnswer,
      type: q.type || 'MCQ',
      explanation: q.explanation || ''
    });
  }

  return normalized;
}
