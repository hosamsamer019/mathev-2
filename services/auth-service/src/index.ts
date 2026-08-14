import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import { logger, globalErrorHandler, validateEnv } from '@shared/utils';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 4001;

// Middlewares
app.use(helmet());
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
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Auth Service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);

app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`🚀 Auth Service running on http://localhost:${PORT}`);
  });
}

export default app;
