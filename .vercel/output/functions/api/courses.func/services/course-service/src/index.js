"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const course_routes_js_1 = __importDefault(require("./routes/course.routes.js"));
const homework_routes_js_1 = __importDefault(require("./routes/homework.routes.js"));
const exam_routes_js_1 = __importDefault(require("./routes/exam.routes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4004;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Mount Routes
app.use('/api/courses', course_routes_js_1.default);
app.use('/api/homework', homework_routes_js_1.default);
app.use('/api/exams', exam_routes_js_1.default);
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'OK', service: 'Course Service', timestamp: new Date().toISOString() });
});
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Course Service running on http://localhost:${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map