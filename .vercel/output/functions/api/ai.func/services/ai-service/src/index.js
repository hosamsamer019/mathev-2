"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const solver_service_js_1 = require("./services/solver.service.js");
const chat_service_js_1 = require("./services/chat.service.js");
const auth_middleware_js_1 = require("./middlewares/auth.middleware.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4003;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const solveSchema = zod_1.z.object({
    problem: zod_1.z.string().min(1).max(1000),
    level: zod_1.z.string().optional()
});
const chatSchema = zod_1.z.object({
    sessionId: zod_1.z.string(),
    message: zod_1.z.string().min(1).max(500)
});
// Solve endpoint — now requires authentication
app.post('/api/ai/solve', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const isAllowed = await chat_service_js_1.ChatService.checkRateLimit(userId);
        if (!isAllowed) {
            return res.status(429).json({ message: 'Rate limit exceeded. Please wait.' });
        }
        const { problem, level } = solveSchema.parse(req.body);
        const result = await solver_service_js_1.SolverService.solve(problem, level);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: 'AI Solver encountered an error' });
    }
});
// Chat endpoints — all require authentication
app.post('/api/ai/sessions', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const session = await chat_service_js_1.ChatService.createSession(userId);
        res.status(201).json(session);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating session', error: error.message });
    }
});
app.get('/api/ai/sessions', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const sessions = await chat_service_js_1.ChatService.getUserSessions(userId);
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sessions', error: error.message });
    }
});
app.get('/api/ai/sessions/:id', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const session = await chat_service_js_1.ChatService.getSessionHistory(req.params.id, userId);
        if (!session)
            return res.status(404).json({ message: 'Session not found' });
        res.json(session);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching session', error: error.message });
    }
});
app.post('/api/ai/chat', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const isAllowed = await chat_service_js_1.ChatService.checkRateLimit(userId);
        if (!isAllowed) {
            return res.status(429).json({ message: 'Rate limit exceeded. Please wait.' });
        }
        const { sessionId, message } = chatSchema.parse(req.body);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        await chat_service_js_1.ChatService.chatStream(userId, sessionId, message, res);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            if (!res.headersSent)
                return res.status(400).json({ errors: error.errors });
        }
        if (!res.headersSent) {
            res.status(500).json({ message: 'Chat error', error: error.message });
        }
        else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', service: 'AI Service', timestamp: new Date().toISOString() });
});
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 AI Service running on http://localhost:${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map