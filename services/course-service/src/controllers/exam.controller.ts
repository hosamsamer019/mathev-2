import { Request, Response } from 'express';
import { z } from 'zod';
import { ExamService } from '../services/exam.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const answersArraySchema = z.array(z.object({
  questionId: z.string(),
  selectedOption: z.number().int().nonnegative()
}));

const submitExamSchema = z.object({
  answers: answersArraySchema
});

const violationSchema = z.object({
  type: z.enum(['TAB_SWITCH', 'CAMERA_OFF'])
});

export const getExamsByCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const exams = await ExamService.getExamsByCourse(courseId);
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

export const getExamDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await ExamService.getExamDetailsForStudent(id);
    res.json(exam);
  } catch (error: any) {
    if (error.message === 'Exam not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching exam', error: error.message });
  }
};

export const startAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const attempt = await ExamService.startAttempt(userId, examId);
    res.status(201).json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: 'Error starting exam', error: error.message });
  }
};

export const syncDraft = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { answers } = submitExamSchema.parse(req.body) as any;
    await ExamService.syncDraft(userId, examId, answers);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: 'Error syncing draft', error: error.message });
  }
};

export const logViolation = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { type } = violationSchema.parse(req.body);
    await ExamService.logViolation(userId, examId, type);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: 'Error logging violation', error: error.message });
  }
};

export const submitAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { answers } = submitExamSchema.parse(req.body) as any;
    const result = await ExamService.submitAttempt(userId, examId, answers);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: 'Error submitting exam', error: error.message });
  }
};
