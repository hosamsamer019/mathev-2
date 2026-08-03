import { OpenRouterClient } from './openrouter.client.js';
import { ChatRepository } from '../repositories/chat.repository.js';
import Redis from 'ioredis';

const getOpenRouterClient = () => {
  return new OpenRouterClient({ timeoutMs: 60000 }); // Longer timeout for streaming
};

let redis: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null // Stop retrying if connection fails
  });
  redis.on('error', (err) => {
    console.warn('Redis connection failed, using in-memory rate limiter fallback.');
    redis = null;
  });
} catch (error) {
  console.error('Failed to initialize Redis in AI service');
}

const CHAT_SYSTEM_PROMPT = `أنت مساعد رياضيات ذكي ودود يتحدث العربية. أنت تساعد الطلاب في فهم المفاهيم الرياضية وحل المسائل خطوة بخطوة. كن مشجعاً وصبوراً. لا تقدم الإجابة مباشرة، بل ساعد الطالب على التفكير والوصول للحل بنفسه.`;

const MAX_REQUESTS_PER_MINUTE = 10;

const inMemoryRateLimiter = new Map<string, { count: number; resetAt: number }>();

export class ChatService {
  static async checkRateLimit(userId: string): Promise<boolean> {
    const handleInMemoryLimit = () => {
      const now = Date.now();
      let record = inMemoryRateLimiter.get(userId);
      if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + 60000 };
      } else {
        record.count++;
      }
      inMemoryRateLimiter.set(userId, record);
      return record.count <= MAX_REQUESTS_PER_MINUTE;
    };

    try {
      if (!redis || redis.status !== 'ready') {
        console.error('Redis is not ready, falling back to in-memory rate limiter');
        return handleInMemoryLimit();
      }
      const key = `ratelimit:ai:chat:${userId}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, 60); // 1 minute expiration
      }

      if (current > MAX_REQUESTS_PER_MINUTE) {
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Redis rate limit error:', e, 'falling back to in-memory rate limiter');
      return handleInMemoryLimit();
    }
  }

  static async createSession(userId: string) {
    return ChatRepository.createSession(userId);
  }

  static async getUserSessions(userId: string) {
    return ChatRepository.getSessionsByUser(userId);
  }

  static async getSessionHistory(sessionId: string, userId: string) {
    return ChatRepository.getSessionById(sessionId, userId);
  }

  static async chatStream(userId: string, sessionId: string, userMessage: string, res: any) {
    const client = getOpenRouterClient();
    
    // Validate session ownership
    const session = await ChatRepository.getSessionById(sessionId, userId);
    if (!session) throw new Error('Session not found');

    // Save user message
    await ChatRepository.addMessage(sessionId, 'user', userMessage);

    // Get recent messages for context (last 10)
    const recentMessages = await ChatRepository.getRecentMessages(sessionId, 10);

    // Build OpenRouter messages array with system prompt + chat history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...recentMessages.map((m: any) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content as string,
      })),
    ];

    let fullReply = '';
    try {
      for await (const content of client.chatCompletionStream({ messages })) {
        if (content) {
          fullReply += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    } catch (error: any) {
      console.error('[ChatService] OpenRouter streaming error:', error.message);
      if (!fullReply) {
        // No content was sent yet, send error as a stream event
        res.write(`data: ${JSON.stringify({ error: 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. حاول مرة أخرى.' })}\n\n`);
      }
    }

    if (fullReply) {
      await ChatRepository.addMessage(sessionId, 'assistant', fullReply);
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
