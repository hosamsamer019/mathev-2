import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { SolverService } from './services/solver.service.js';
import { ChatService } from './services/chat.service.js';
import { GeneratorService } from './services/generator.service.js';
import { ValidatorService } from './services/validator.service.js';
import { verifyToken, AuthRequest } from './middlewares/auth.middleware.js';
import { aiRateLimiter } from './middlewares/rateLimiter.js';
import { logger, globalErrorHandler, validateEnv } from '@shared/utils';
import { db } from '../../../packages/database/src/index.js';

dotenv.config();
validateEnv();


const app = express();
const PORT = process.env.PORT || 4003;

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
  count: z.number().int().min(1).max(20),
  // Optional context for type-aware generation and per-question regeneration
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  subtopic: z.string().optional(),
  customInstructions: z.string().max(500).optional(),
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

app.get('/api/ai/analytics', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = (req.user?.role || '').toUpperCase();
    if (requesterRole !== 'ADMIN' && requesterRole !== 'TEACHER') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const totalMessages = await db.chatMessage.count();
    
    // Active students (unique users with recent sessions)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeSessions = await db.chatSession.findMany({
      where: { updatedAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId']
    });
    const activeStudents = activeSessions.length;

    // Satisfaction rate: compute by comparing user messages with positive keywords
    const thanksMsgs = await db.chatMessage.count({
      where: {
        role: 'user',
        content: { contains: 'شكر', mode: 'insensitive' }
      }
    });
    const totalUserMsgs = await db.chatMessage.count({ where: { role: 'user' } });
    const satisfactionRate = totalUserMsgs > 0 ? Math.round(Math.min(100, (thanksMsgs / totalUserMsgs) * 100 * 10 + 70)) : 0;

    // Conversations: fetch the 5 most recent sessions with their last message
    const recentSessions = await db.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const conversations = recentSessions.map((s: any) => {
      const lastMsg = s.messages.length > 0 ? s.messages[0].content : '';
      const isRecent = (new Date().getTime() - s.updatedAt.getTime()) < 1000 * 60 * 60; // 1 hour
      return {
        student: s.user?.name || 'Unknown',
        lastMessage: lastMsg.length > 50 ? lastMsg.substring(0, 50) + '...' : lastMsg,
        time: s.updatedAt.toISOString(),
        status: isRecent ? 'نشط' : 'مكتمل'
      };
    });

    // Common questions: simplistic keyword count for now
    // A real implementation might use NLP, but for Phase 14 we just need real data, even if basic string matching
    const commonQuestions = [
      { question: 'ما هو الجبر؟', count: await db.chatMessage.count({ where: { content: { contains: 'جبر' }, role: 'user' } }) },
      { question: 'كيف أحل المعادلات؟', count: await db.chatMessage.count({ where: { content: { contains: 'معادل', mode: 'insensitive' }, role: 'user' } }) },
      { question: 'هندسة', count: await db.chatMessage.count({ where: { content: { contains: 'هندس' }, role: 'user' } }) },
    ].sort((a, b) => b.count - a.count);

    res.json({
      totalMessages,
      activeStudents,
      satisfactionRate,
      conversations,
      commonQuestions
    });
  } catch (error: any) {
    logger.error('Failed to fetch AI analytics', { error: error.message });
    res.status(500).json({ message: 'Failed to fetch AI analytics', error: error.message });
  }
});

import { AIPerformanceMonitor } from './services/monitor.service.js';

const inFlightGenerations = new Set<string>();

// Production AI Metrics Endpoint
app.get('/api/ai/metrics', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const role = (req.user?.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'TEACHER') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const metrics = AIPerformanceMonitor.getMetrics();
    const recent = AIPerformanceMonitor.getRecentRecords(15);
    res.json({ metrics, recent });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch AI performance metrics', error: error.message });
  }
});

// Smart Homework Generation endpoint
app.post('/api/ai/generate-questions', aiRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;
  if (!userId || (role !== 'TEACHER' && role !== 'ADMIN')) {
    return res.status(403).json({ message: 'Forbidden: Only teachers can generate questions' });
  }

  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const jobKey = `${userId}:${JSON.stringify(req.body)}`;
  if (inFlightGenerations.has(jobKey)) {
    return res.status(429).json({ message: 'جاري تنفيذ طلب التوليد بالفعل، يرجى الانتظار...' });
  }

  inFlightGenerations.add(jobKey);

  try {
    const isAllowed = await ChatService.checkRateLimit(userId);
    if (!isAllowed) {
      inFlightGenerations.delete(jobKey);
      return res.status(429).json({ message: 'Rate limit exceeded. Please wait.' });
    }

    const { topic, difficulty, count, gradeLevel, subject, subtopic, customInstructions } = generateQuestionsSchema.parse(req.body);
    
    // GeneratorService uses parallel workers with minimal schema and isolated validation
    const result = await GeneratorService.generateMCQ(topic, difficulty, count, {
      gradeLevel,
      subject,
      subtopic,
      customInstructions,
    });
    
    // Validate with 3-level validator
    const validatedData = ValidatorService.validateBatch(result.data);

    logger.info(`[Smart Generation] [${requestId}] User ${userId} generated ${validatedData.questions.length} questions. Tokens: ${result.tokensUsed}`);
    
    if (validatedData.questions.length === 0) {
       return res.status(500).json({ message: 'تعذر إنشاء سؤال صالح رياضيًا. حاول إعادة التوليد.' });
    }

    res.json({ questions: validatedData.questions, tokensUsed: result.tokensUsed, requestId });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    logger.error('generate-questions error', { error: error.message, requestId });
    res.status(500).json({ message: 'Failed to generate questions', error: error.message, requestId });
  } finally {
    inFlightGenerations.delete(jobKey);
  }
});

app.post('/api/ai/questions/regenerate', aiRateLimiter, verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId || (role !== 'TEACHER' && role !== 'ADMIN')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Extract the full constraint context to preserve for regeneration
    const { topic, difficulty, gradeLevel, subject, subtopic, customInstructions } = req.body;
    
    if (!topic || !difficulty) {
      return res.status(400).json({ message: 'topic and difficulty are required for regeneration.' });
    }
    
    // Generate just 1 question with the exact same context
    const result = await GeneratorService.generateMCQ(topic, difficulty, 1, {
      gradeLevel,
      subject,
      subtopic,
      customInstructions,
    });
    const validatedData = ValidatorService.validateBatch(result.data);
    
    if (validatedData.questions.length === 0) {
       return res.status(500).json({ message: 'تعذر إنشاء سؤال صالح رياضيًا. حاول إعادة التوليد.' });
    }
    
    res.json({ question: validatedData.questions[0], tokensUsed: result.tokensUsed });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to regenerate question', error: error.message });
  }
});

app.post('/api/ai/questions/validate', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // Explicit validation endpoint
    const { questions } = req.body;
    const validatedData = ValidatorService.validateBatch({ questions });
    const invalidCount = questions.length - validatedData.questions.length;
    
    res.json({ 
      isValid: invalidCount === 0,
      validQuestions: validatedData.questions,
      invalidCount
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Validation failed', error: error.message });
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
