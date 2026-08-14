import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.routes.js';
import { logger, globalErrorHandler, validateEnv, initSentry } from '@shared/utils';
import { analyticsRateLimiter } from './middlewares/rateLimiter';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 4005;

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
app.use(analyticsRateLimiter);

app.use('/api/analytics', analyticsRoutes);

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Analytics Service', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`🚀 Analytics Service running on http://localhost:${PORT}`);
  });
}

export default app;
