import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { verifyToken, AuthRequest } from './middlewares/auth.middleware.js';
import { AnalyticsService } from './services/analytics.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Student Analytics Endpoints
app.get('/api/analytics/student/overview', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const overview = await AnalyticsService.getOverview(userId);
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching overview', error: error.message });
  }
});

app.get('/api/analytics/student/charts', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const charts = await AnalyticsService.getCharts(userId);
    res.json(charts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching charts', error: error.message });
  }
});

app.get('/api/analytics/student/recent', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const recent = await AnalyticsService.getRecentActivities(userId, 10);
    res.json(recent);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching recent activities', error: error.message });
  }
});

import { db } from '@smartmath/database';

// Parent Portal Analytics Endpoint
app.get('/api/analytics/parent/child/:childId/overview', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?.userId;
    const { childId } = req.params;
    if (!parentId) return res.status(401).json({ message: 'Unauthorized' });

    // Verify relation
    const relation = await db.parentChildRelation.findUnique({
      where: { parentId_childId: { parentId, childId } }
    });

    if (!relation) {
      return res.status(403).json({ message: 'Not authorized to view this child\'s analytics' });
    }

    const overview = await AnalyticsService.getOverview(childId);
    const charts = await AnalyticsService.getCharts(childId);
    const recent = await AnalyticsService.getRecentActivities(childId, 10);

    res.json({
      overview,
      charts,
      recent
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching child analytics', error: error.message });
  }
});

// Teacher Class Overview
app.get('/api/analytics/teacher/:teacherId/overview', verifyToken, async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const overview = await AnalyticsService.getTeacherOverview(teacherId);
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching teacher analytics', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Analytics Service running on http://localhost:${PORT}`);
});
