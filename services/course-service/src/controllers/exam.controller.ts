import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getAllExams = async (req: Request, res: Response) => {
  try {
    const exams = await db.exam.findMany({
      include: {
        _count: { select: { attempts: true } },
        course: { select: { title: true } }
      }
    });
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

export const getExamsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const exams = await db.exam.findMany({
      where: { courseId },
      include: {
        _count: { select: { attempts: true } }
      }
    });
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

export const getExamDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await db.exam.findUnique({
      where: { id },
      include: { attempts: true }
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exam', error: error.message });
  }
};

export const createExam = async (req: Request, res: Response) => {
  try {
    const { title, courseId } = req.body;
    const exam = await db.exam.create({
      data: {
        title,
        courseId
      }
    });
    res.status(201).json(exam);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating exam', error: error.message });
  }
};

export const startAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const attempt = await db.examAttempt.create({
      data: {
        studentId: userId,
        examId,
        score: 0
      }
    });
    res.status(201).json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: 'Error starting exam', error: error.message });
  }
};

export const submitAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id: examId } = req.params;
    const userId = req.user?.userId;
    const { score } = req.body; // Mocked score submission logic
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const attempt = await db.examAttempt.create({
      data: {
        studentId: userId,
        examId,
        score: score || 0
      }
    });
    res.json({ success: true, attempt });
  } catch (error: any) {
    res.status(400).json({ message: 'Error submitting exam', error: error.message });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.exam.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting exam', error: error.message });
  }
};
