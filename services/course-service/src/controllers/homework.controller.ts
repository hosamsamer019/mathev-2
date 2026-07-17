import { Request, Response } from 'express';
import { z } from 'zod';
import { HomeworkService } from '../services/homework.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const homeworkCreateSchema = z.object({
  title: z.string().min(3),
  courseId: z.string(),
  deadline: z.coerce.date(),
  status: z.string().default('active')
});

const questionCreateSchema = z.object({
  homeworkId: z.string(),
  questionText: z.string().min(3),
  options: z.array(z.string()).min(2),
  correctOption: z.number().int().nonnegative()
});

const submitHomeworkSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    selectedOption: z.number().int().nonnegative()
  })).min(1)
});

export const getAllHomeworks = async (req: Request, res: Response) => {
  try {
    const homeworks = await HomeworkService.getAllHomeworks();
    res.json(homeworks);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching all homeworks', error: error.message });
  }
};

export const getHomeworksByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const homeworks = await HomeworkService.getHomeworksByCourse(courseId);
    res.json(homeworks);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching homeworks', error: error.message });
  }
};

export const getHomeworkDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const homework = await HomeworkService.getHomeworkDetails(id);
    res.json(homework);
  } catch (error: any) {
    if (error.message === 'Homework not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching homework details', error: error.message });
  }
};

export const createHomework = async (req: Request, res: Response) => {
  try {
    const data = homeworkCreateSchema.parse(req.body) as any;
    const homework = await HomeworkService.createHomework(data);
    res.status(201).json(homework);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating homework', error: error.message });
  }
};

export const addQuestion = async (req: Request, res: Response) => {
  try {
    const data = questionCreateSchema.parse(req.body) as any;
    const question = await HomeworkService.addQuestion(data);
    res.status(201).json(question);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error adding question', error: error.message });
  }
};

export const submitHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { id: homeworkId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User unauthorized' });
    }

    const { answers } = submitHomeworkSchema.parse(req.body) as any;
    const submission = await HomeworkService.submitHomework(userId, homeworkId, answers);
    
    res.status(201).json(submission);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error submitting homework', error: error.message });
  }
};

export const getStudentSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { id: homeworkId } = req.params;
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User unauthorized' });
    }

    const submission = await HomeworkService.getStudentSubmission(userId, homeworkId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching submission', error: error.message });
  }
};
