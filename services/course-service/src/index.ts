import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import courseRoutes from './routes/course.routes.js';
import homeworkRoutes from './routes/homework.routes.js';
import examRoutes from './routes/exam.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/api/courses', courseRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/exams', examRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Course Service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Course Service running on http://localhost:${PORT}`);
});

