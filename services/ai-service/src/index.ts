import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { SolverService } from './services/solver.service.js';
import { ChatService } from './services/chat.service.js';
import { GeneratorService } from './services/generator.service.js';
import { verifyToken, AuthRequest } from './middlewares/auth.middleware.js';
import { aiRateLimiter } from './middlewares/rateLimiter.js';
import { logger, globalErrorHandler, validateEnv } from '@shared/utils';

dotenv.config();
validateEnv();


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

const generateQuestionsSchema = z.object({
  topic: z.string().min(1).max(500),
  difficulty: z.string().min(1).max(50),
  count: z.number().int().min(1).max(20) // Capped at 20 to bound costs
});

// Solve endpoint — now requires authentication
app.post('/api/ai/solve', aiRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
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

app.post('/api/ai/history/save', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const { problem, solution } = req.body;
    if (!problem || !solution) return res.status(400).json({ message: 'Missing problem or solution' });
    
    const saved = await SolverService.saveSolution(userId, problem, solution);
    res.json(saved);
  } catch (error) {
    logger.error('Failed to save solution', { error });
    res.status(500).json({ message: 'Failed to save solution' });
  }
});

app.get('/api/ai/history', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const history = await SolverService.getHistory(userId);
    res.json(history);
  } catch (error) {
    logger.error('Failed to get history', { error });
    res.status(500).json({ message: 'Failed to get history' });
  }
});

// Chat endpoints — all require authentication
app.post('/api/ai/sessions', aiRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
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
    logger.error('getSessions error', { error: error.message });
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

app.post('/api/ai/chat', aiRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
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

// Smart Homework Generation endpoint
app.post('/api/ai/generate-questions', aiRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || (role !== 'TEACHER' && role !== 'ADMIN')) {
      return res.status(403).json({ message: 'Forbidden: Only teachers can generate questions' });
    }

    // Reuse Phase 1 rate limiter to cap costs
    const isAllowed = await ChatService.checkRateLimit(userId);
    if (!isAllowed) {
      return res.status(429).json({ message: 'Rate limit exceeded. Please wait.' });
    }

    const { topic, difficulty, count } = generateQuestionsSchema.parse(req.body);
    
    // GeneratorService retries internally if parsing fails
    const result = await GeneratorService.generateMCQ(topic, difficulty, count);
    
    // Log token usage for basic cost visibility
    logger.info(`[Smart Generation] User ${userId} generated ${count} questions. Tokens used: ${result.tokensUsed}`);
    
    res.json({ questions: result.data.questions, tokensUsed: result.tokensUsed });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    logger.error('generate-questions error', { error: error.message });
    res.status(500).json({ message: 'Failed to generate questions', error: error.message });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'AI Service', timestamp: new Date().toISOString() });
});

app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`🚀 AI Service running on http://localhost:${PORT}`);
  });
}

export default app;
