import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import courseRoutes from './routes/course.routes.js';
import homeworkRoutes from './routes/homework.routes.js';
import examRoutes from './routes/exam.routes.js';
import questionRoutes from './routes/question.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';

import http from 'http';
import { Server } from 'socket.io';
import { logger, globalErrorHandler, validateEnv } from '@shared/utils';
import { setupRiskEngineJob } from './jobs/riskEngine.job.js';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 4004;

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    const allowedOrigin = process.env.CLIENT_URL || 'https://your-production-domain.com';
    if (origin === allowedOrigin || origin.includes('vercel.app')) { return callback(null, true); }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount Routes
app.use('/api/courses', courseRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/assessments', assessmentRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Course Service', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

const server = http.createServer(app);
export const io = new Server(server, {
  cors: corsOptions
});

import jwt from 'jsonwebtoken';
import { db } from '../../../packages/database/src/index.js';

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    socket.data.user = decoded;
    
    // Admin namespace
    if (decoded.role === 'ADMIN') socket.join('admin');
    
    // Teacher namespace
    if (decoded.role === 'TEACHER') {
      socket.join('teachers');
      // Join all courses this teacher owns
      const courses = await db.course.findMany({ where: { teacherId: decoded.userId }, select: { id: true } });
      courses.forEach(c => socket.join(`course:${c.id}`));
    }
    
    // Student namespace
    if (decoded.role.includes('STUDENT') || decoded.role === 'PARENT') {
      const enrollments = await db.courseEnrollment.findMany({ where: { studentId: decoded.userId }, select: { courseId: true } });
      enrollments.forEach(e => socket.join(`course:${e.courseId}`));
    }
    
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`🔌 Client connected to Course Socket: ${socket.id} (User: ${socket.data.user?.userId})`);
  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  server.listen(PORT, () => {
    logger.info(`🚀 Course Service (w/ Socket.IO) running on http://localhost:${PORT}`);
    setupRiskEngineJob().catch(console.error);
  });
}

export default app;
