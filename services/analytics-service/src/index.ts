import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analytics.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/analytics', analyticsRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Analytics Service running on http://localhost:${PORT}`);
  });
}

export default app;
