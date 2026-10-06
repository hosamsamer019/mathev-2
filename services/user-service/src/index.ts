import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import userRoutes from './routes/user.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { logger, globalErrorHandler, validateEnv, initSentry, createCorsOptions, configureTrustProxy } from '@shared/utils';
import { userRateLimiter } from './middlewares/rateLimiter';

dotenv.config();
validateEnv();

const app = express();
configureTrustProxy(app);
const PORT = process.env.PORT || 4002;

app.use(helmet());
const corsOptions = createCorsOptions();
app.use(cors(corsOptions));
app.use(express.json());
app.use(userRateLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'User Service', timestamp: new Date().toISOString() });
});

app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(globalErrorHandler);

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 User Service running on http://localhost:${PORT}`);
  });
}

export default app;
