import { Request, Response } from 'express';
import { db } from '@smartmath/database';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, status } = req.body;
    
    const attendance = await db.attendance.create({
      data: {
        studentId,
        date: new Date(),
        status
      }
    });
    
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const records = await db.attendance.findMany({
      where: { studentId: userId },
      orderBy: { date: 'desc' }
    });
    
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};
