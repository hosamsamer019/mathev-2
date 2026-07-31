import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatRepository } from '../repositories/chat.repository.js';
import Redis from 'ioredis';

const getGeminiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'placeholder_key' || key === '') {
    throw new Error('500 Internal Server Error: GEMINI_API_KEY is missing');
  }
  return new GoogleGenerativeAI(key);
};

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null // Stop retrying if connection fails
});
redis.on('error', (err) => console.warn('Redis connection failed, using in-memory rate limiter fallback.'));

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
      if (redis.status !== 'ready') {
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
    // Check key before anything
    const genAI = getGeminiClient();
    
    // Validate session ownership
    const session = await ChatRepository.getSessionById(sessionId, userId);
    if (!session) throw new Error('Session not found');

    // Save user message
    await ChatRepository.addMessage(sessionId, 'user', userMessage);

    // Get recent messages for context (last 10)
    const recentMessages = await ChatRepository.getRecentMessages(sessionId, 10);

    // Prepare Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: CHAT_SYSTEM_PROMPT,
    });

    // Map history to Gemini format. Discard the new userMessage from the history array since we pass it to sendMessageStream.
    // Wait, recentMessages will include the message we just saved.
    // Let's filter it out or just send it as part of generateContentStream.
    // Actually, ChatRepository.addMessage is awaited BEFORE getRecentMessages.
    // So recentMessages includes the current userMessage.
    
    // So we can just use generateContentStream with all messages.
    const contents = recentMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const result = await model.generateContentStream({ contents });

    let fullReply = '';
    for await (const chunk of result.stream) {
      const content = chunk.text();
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
