import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.routes.js';
import { logger, globalErrorHandler, validateEnv } from '@shared/utils';

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());

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
