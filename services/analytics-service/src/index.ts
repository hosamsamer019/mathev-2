import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.routes.js';
import { logger, globalErrorHandler, validateEnv, initSentry, createCorsOptions, configureTrustProxy } from '@shared/utils';
import { analyticsRateLimiter } from './middlewares/rateLimiter';

dotenv.config();
validateEnv();

const app = express();
configureTrustProxy(app);
const PORT = process.env.PORT || 4005;

app.use(helmet());
const corsOptions = createCorsOptions();
app.use(cors(corsOptions));
app.use(express.json());
app.use(analyticsRateLimiter);

app.use('/api/analytics', analyticsRoutes);

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Analytics Service', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Analytics Service running on http://localhost:${PORT}`);
  });
}

export default app;
