import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { SolverService } from './services/solver.service.js';
import { ChatService } from './services/chat.service.js';
import { verifyToken, AuthRequest } from './middlewares/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

app.use(helmet());
app.use(cors());
app.use(express.json());

const solveSchema = z.object({
  problem: z.string().min(1).max(1000),
  level: z.string().optional()
});

const chatSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(500)
});

// Solve endpoint — now requires authentication
app.post('/api/ai/solve', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const isAllowed = await ChatService.checkRateLimit(userId);
    if (!isAllowed) {
      return res.status(429).json({ message: 'Rate limit exceeded. Please wait.' });
    }

    const { problem, level } = solveSchema.parse(req.body);
    const result = await SolverService.solve(problem, level);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'AI Solver encountered an error' });
  }
});

// Chat endpoints — all require authentication
app.post('/api/ai/sessions', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await ChatService.createSession(userId);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating session', error: error.message });
  }
});

app.get('/api/ai/sessions', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const sessions = await ChatService.getUserSessions(userId);
    res.json(sessions);
  } catch (error: any) {
    console.error('getSessions error:', error);
    res.status(500).json({ message: 'Error fetching sessions', error: error.message });
  }
});

app.get('/api/ai/sessions/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await ChatService.getSessionHistory(req.params.id, userId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching session', error: error.message });
  }
});

app.post('/api/ai/chat', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const isAllowed = await ChatService.checkRateLimit(userId);
    if (!isAllowed) {
      return res.status(429).json({ message: 'Rate limit exceeded. Please wait.' });
    }

    const { sessionId, message } = chatSchema.parse(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await ChatService.chatStream(userId, sessionId, message, res);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      if (!res.headersSent) return res.status(400).json({ errors: error.errors });
    }
    if (!res.headersSent) {
      res.status(500).json({ message: 'Chat error', error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'AI Service', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 AI Service running on http://localhost:${PORT}`);
  });
}

export default app;
