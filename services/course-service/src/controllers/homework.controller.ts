import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getAllHomeworks = async (req: Request, res: Response) => {
  try {
    const homeworks = await db.homework.findMany({
      include: {
        _count: { select: { submissions: true } }
      }
    });
    res.json(homeworks);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching all homeworks', error: error.message });
  }
};

export const getHomeworksByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const homeworks = await db.homework.findMany({
      where: { courseId },
      include: {
        _count: { select: { submissions: true } }
      }
    });
    res.json(homeworks);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching homeworks', error: error.message });
  }
};

export const getHomeworkDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const homework = await db.homework.findUnique({
      where: { id },
      include: { submissions: true }
    });
    if (!homework) return res.status(404).json({ message: 'Homework not found' });
    res.json(homework);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching homework details', error: error.message });
  }
};

export const createHomework = async (req: Request, res: Response) => {
  try {
    const { title, courseId } = req.body;
    const homework = await db.homework.create({
      data: {
        title,
        courseId
      }
    });
    res.status(201).json(homework);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating homework', error: error.message });
  }
};

export const submitHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { id: homeworkId } = req.params;
    const userId = req.user?.userId;
    const { grade, url } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User unauthorized' });
    }

    const submission = await db.submission.create({
      data: {
        studentId: userId,
        homeworkId,
        grade,
        url
      }
    });
    
    res.status(201).json(submission);
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting homework', error: error.message });
  }
};

export const deleteHomework = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.homework.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting homework', error: error.message });
  }
};

export const getStudentSubmission = async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Stub for getStudentSubmission' });
};

export const addQuestion = async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Stub for addQuestion' });
};
