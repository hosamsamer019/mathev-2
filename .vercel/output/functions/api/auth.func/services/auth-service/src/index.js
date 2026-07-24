"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4001;
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
        if (origin === allowedOrigin) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Health Check
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', service: 'Auth Service', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_routes_js_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Auth Service running on http://localhost:${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map