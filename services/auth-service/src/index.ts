import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import { logger, globalErrorHandler, validateEnv, createCorsOptions, configureTrustProxy } from '@shared/utils';

dotenv.config();
validateEnv();

const app = express();
configureTrustProxy(app);
const PORT = process.env.PORT || 4001;

// Middlewares
app.use(helmet());
const corsOptions = createCorsOptions();
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

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Auth Service running on http://localhost:${PORT}`);
  });
}

export default app;
