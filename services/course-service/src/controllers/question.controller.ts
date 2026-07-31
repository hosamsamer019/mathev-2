import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { db } from '../../../../packages/database/src/index.js';
import { z } from 'zod';

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required'),
  type: z.string().default('MCQ'),
  options: z.array(z.string()).min(2, 'At least 2 options are required'),
  correctAnswer: z.number().int().min(0),
  tag: z.string().optional()
});

export const createQuestion = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'TEACHER') {
      return res.status(403).json({ message: 'Only teachers can create questions in the bank' });
    }

    const data = questionSchema.parse(req.body);

    const question = await db.question.create({
      data: {
        teacherId: req.user.userId,
        text: data.text,
        type: data.type,
        options: data.options,
        correctAnswer: data.correctAnswer,
        tag: data.tag || null
      }
    });

    res.status(201).json(question);
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
      teacherId: req.user.userId
    };

    if (tag && typeof tag === 'string' && tag.trim() !== '') {
      where.tag = { contains: tag, mode: 'insensitive' };
    }

    const questions = await db.question.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(questions);
  } catch (error) {
    console.error('getQuestions error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await db.question.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Question not found' });
    
    // Ownership check (Teacher only edits own question, admin can edit any)
    if (existing.teacherId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const data = questionSchema.parse(req.body);

    const updated = await db.question.update({
      where: { id },
      data: {
        text: data.text,
        type: data.type,
        options: data.options,
        correctAnswer: data.correctAnswer,
        tag: data.tag || null
      }
    });

    res.json(updated);
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

    const existing = await db.question.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Question not found' });
    
    // Ownership check
    if (existing.teacherId !== req.user?.userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.question.delete({ where: { id } });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('deleteQuestion error:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};
