import OpenAI from 'openai';
import { ChatRepository } from '../repositories/chat.repository.js';
import Redis from 'ioredis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder_key'
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null // Stop retrying if connection fails
});
redis.on('error', (err) => console.warn('Redis connection failed, using in-memory rate limiter fallback.'));

const CHAT_SYSTEM_PROMPT = `أنت مساعد رياضيات ذكي ودود يتحدث العربية. أنت تساعد الطلاب في فهم المفاهيم الرياضية وحل المسائل خطوة بخطوة. كن مشجعاً وصبوراً. لا تقدم الإجابة مباشرة، بل ساعد الطالب على التفكير والوصول للحل بنفسه.`;

const MAX_REQUESTS_PER_MINUTE = 10;

export class ChatService {
  static async checkRateLimit(userId: string): Promise<boolean> {
    try {
      if (redis.status !== 'ready') {
        // Fallback for local development if Redis is not running
        return true; 
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
      console.warn('Redis rate limit error, bypassing limit for local dev:', e);
      return true;
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
    // Validate session ownership
    const session = await ChatRepository.getSessionById(sessionId, userId);
    if (!session) throw new Error('Session not found');

    // Save user message
    await ChatRepository.addMessage(sessionId, 'user', userMessage);

    // Get recent messages for context (last 10)
    const recentMessages = await ChatRepository.getRecentMessages(sessionId, 10);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
      ...recentMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    ];

    // Check for real API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'placeholder_key') {
      throw new Error('500 Internal Server Error: OPENAI_API_KEY is missing');
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1024,
      stream: true
    });

    let fullReply = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullReply += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await ChatRepository.addMessage(sessionId, 'assistant', fullReply);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }

}
