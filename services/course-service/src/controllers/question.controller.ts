import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { db } from '../../../../packages/database/src/index.js';
import { z } from 'zod';

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required'),
  type: z.string().default('MCQ'),
  options: z.array(z.string()).min(2, 'At least 2 options are required'),
  correctAnswer: z.number().int().min(0),
  tag: z.string().optional(),
  academicLevel: z.enum(['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3']).optional(),
  country: z.string().optional(),
  educationLevel: z.string().optional(),
  gradeLevel: z.string().optional(),
  mathExpression: z.string().nullable().optional(),
  diagram: z.any().nullable().optional(),
  solutionSteps: z.any().nullable().optional(),
  given: z.any().nullable().optional(),
  required: z.string().nullable().optional(),
  explanation: z.string().nullable().optional()
});

export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can create questions in the bank' });
    }

    const data = questionSchema.parse(req.body);

    const question = await db.questionBank.create({
      data: {
        creatorId: req.user.userId,
        text: data.text,
        type: data.type,
        options: data.options,
        correctAnswer: data.correctAnswer,
        topic: data.tag || null,
        academicLevel: data.academicLevel as any,
        country: (data.country || null) as any,
        educationLevel: (data.educationLevel || null) as any,
        gradeLevel: (data.gradeLevel || null) as any,
        mathExpression: data.mathExpression,
        diagram: data.diagram,
        solutionSteps: data.solutionSteps,
        given: data.given,
        required: data.required,
        explanation: data.explanation
      }
    });

    res.status(201).json({
      ...question,
      tag: question.topic
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('createQuestion error:', error);
    res.status(500).json({ message: 'Error creating question' });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can access their question bank' });
    }

    const { tag } = req.query;
    
    const where: any = {
      creatorId: req.user.userId
    };

    if (tag && typeof tag === 'string' && tag.trim() !== '') {
      where.topic = { contains: tag, mode: 'insensitive' };
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const questions = await db.questionBank.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    
    const mapped = questions.map(q => ({
      ...q,
      tag: q.topic
    }));
    
    const total = await db.questionBank.count({ where });

    res.json({
      data: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getQuestions error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await db.questionBank.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Question not found' });
    
    // Ownership check (Teacher only edits own question, admin can edit any)
    if (existing.creatorId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const data = questionSchema.parse(req.body);

    const updated = await db.questionBank.update({
      where: { id },
      data: {
        text: data.text,
        type: data.type,
        options: data.options,
        correctAnswer: data.correctAnswer,
        topic: data.tag || null,
        academicLevel: data.academicLevel as any,
        country: data.country !== undefined ? data.country as any : undefined,
        educationLevel: data.educationLevel !== undefined ? data.educationLevel as any : undefined,
        gradeLevel: data.gradeLevel !== undefined ? data.gradeLevel as any : undefined,
        mathExpression: data.mathExpression !== undefined ? data.mathExpression : undefined,
        diagram: data.diagram !== undefined ? data.diagram : undefined,
        solutionSteps: data.solutionSteps !== undefined ? data.solutionSteps : undefined,
        given: data.given !== undefined ? data.given : undefined,
        required: data.required !== undefined ? data.required : undefined,
        explanation: data.explanation !== undefined ? data.explanation : undefined
      }
    });

    res.json({
      ...updated,
      tag: updated.topic
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('updateQuestion error:', error);
    res.status(500).json({ message: 'Error updating question' });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await db.questionBank.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Question not found' });
    
    // Ownership check
    if (existing.creatorId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.questionBank.delete({ where: { id } });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('deleteQuestion error:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

const batchQuestionsSchema = z.object({
  questions: z.array(questionSchema).min(1, 'At least 1 question is required')
});

export const createQuestionsBatch = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'TEACHER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only teachers can create questions in the bank' });
    }

    const { questions } = batchQuestionsSchema.parse(req.body);
    const creatorId = req.user.userId;

    const created = await db.$transaction(
      questions.map(data => 
        db.questionBank.create({
          data: {
            creatorId,
            text: data.text,
            type: data.type,
            options: data.options,
            correctAnswer: data.correctAnswer,
            topic: data.tag || null,
            academicLevel: data.academicLevel as any,
            country: (data.country || null) as any,
            educationLevel: (data.educationLevel || null) as any,
            gradeLevel: (data.gradeLevel || null) as any,
            mathExpression: data.mathExpression,
            diagram: data.diagram,
            solutionSteps: data.solutionSteps,
            given: data.given,
            required: data.required,
            explanation: data.explanation
          }
        })
      )
    );

    res.status(201).json({
      count: created.length,
      questions: created.map(q => ({ ...q, tag: q.topic }))
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('createQuestionsBatch error:', error);
    res.status(500).json({ message: 'Error batch creating questions', error: error.message });
  }
};
