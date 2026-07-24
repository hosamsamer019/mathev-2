"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_routes_js_1 = __importDefault(require("./routes/user.routes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4002;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', service: 'User Service', timestamp: new Date().toISOString() });
});
app.use('/api/users', user_routes_js_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 User Service running on http://localhost:${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map