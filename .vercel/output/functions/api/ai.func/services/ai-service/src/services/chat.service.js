"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const openai_1 = __importDefault(require("openai"));
const chat_repository_js_1 = require("../repositories/chat.repository.js");
const ioredis_1 = __importDefault(require("ioredis"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || 'placeholder_key'
});
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('error', (err) => console.error('Redis Client Error', err));
const CHAT_SYSTEM_PROMPT = `أنت مساعد رياضيات ذكي ودود يتحدث العربية. أنت تساعد الطلاب في فهم المفاهيم الرياضية وحل المسائل خطوة بخطوة. كن مشجعاً وصبوراً. لا تقدم الإجابة مباشرة، بل ساعد الطالب على التفكير والوصول للحل بنفسه.`;
const MAX_REQUESTS_PER_MINUTE = 10;
class ChatService {
    static async checkRateLimit(userId) {
        try {
            if (redis.status !== 'ready') {
                // Graceful degradation if Redis is down
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
        }
        catch (e) {
            console.error('Redis rate limit error, falling back to allow:', e);
            return true;
        }
    }
    static async createSession(userId) {
        return chat_repository_js_1.ChatRepository.createSession(userId);
    }
    static async getUserSessions(userId) {
        return chat_repository_js_1.ChatRepository.getSessionsByUser(userId);
    }
    static async getSessionHistory(sessionId, userId) {
        return chat_repository_js_1.ChatRepository.getSessionById(sessionId, userId);
    }
    static async chatStream(userId, sessionId, userMessage, res) {
        // Validate session ownership
        const session = await chat_repository_js_1.ChatRepository.getSessionById(sessionId, userId);
        if (!session)
            throw new Error('Session not found');
        // Save user message
        await chat_repository_js_1.ChatRepository.addMessage(sessionId, 'user', userMessage);
        // Get recent messages for context (last 10)
        const recentMessages = await chat_repository_js_1.ChatRepository.getRecentMessages(sessionId, 10);
        const messages = [
            { role: 'system', content: CHAT_SYSTEM_PROMPT },
            ...recentMessages.map((m) => ({
                role: m.role,
                content: m.content
            }))
        ];
        // Check for real API key
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'placeholder_key') {
            // Simulation fallback
            const simulatedReply = this.simulateChat(userMessage);
            const words = simulatedReply.split(' ');
            for (const word of words) {
                res.write(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
                await new Promise(r => setTimeout(r, 50));
            }
            await chat_repository_js_1.ChatRepository.addMessage(sessionId, 'assistant', simulatedReply);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
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
        await chat_repository_js_1.ChatRepository.addMessage(sessionId, 'assistant', fullReply);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
    static simulateChat(message) {
        if (message.includes('=') || message.includes('معادلة')) {
            return 'لحل هذه المعادلة، ابدأ بتحديد المتغير المجهول، ثم اعزله في طرف واحد من المعادلة. هل يمكنك تحديد الخطوة الأولى؟';
        }
        if (message.includes('جبر') || message.includes('الجبر')) {
            return 'الجبر هو فرع من الرياضيات يتعامل مع الرموز والقواعد لمعالجة هذه الرموز. يمكنني مساعدتك في فهم أي مفهوم جبري. ما الموضوع الذي تريد البدء به؟';
        }
        return 'سؤال جيد! دعني أساعدك في فهم هذا المفهوم. هل يمكنك إعطائي مزيداً من التفاصيل حول ما تحتاج مساعدة فيه؟';
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=chat.service.js.map