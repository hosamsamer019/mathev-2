"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_js_1 = require("./middlewares/auth.middleware.js");
const analytics_service_js_1 = require("./services/analytics.service.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4005;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Student Analytics Endpoints
app.get('/api/analytics/student/overview', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const overview = await analytics_service_js_1.AnalyticsService.getOverview(userId);
        res.json(overview);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching overview', error: error.message });
    }
});
app.get('/api/analytics/student/charts', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const charts = await analytics_service_js_1.AnalyticsService.getCharts(userId);
        res.json(charts);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching charts', error: error.message });
    }
});
app.get('/api/analytics/student/recent', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const recent = await analytics_service_js_1.AnalyticsService.getRecentActivities(userId, 10);
        res.json(recent);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching recent activities', error: error.message });
    }
});
const database_1 = require("@smartmath/database");
// Parent Portal Analytics Endpoint
app.get('/api/analytics/parent/child/:childId/overview', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const parentId = req.user?.userId;
        const { childId } = req.params;
        if (!parentId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Verify relation
        const relation = await database_1.db.parentChildRelation.findUnique({
            where: { parentId_childId: { parentId, childId } }
        });
        if (!relation) {
            return res.status(403).json({ message: 'Not authorized to view this child\'s analytics' });
        }
        const overview = await analytics_service_js_1.AnalyticsService.getOverview(childId);
        const charts = await analytics_service_js_1.AnalyticsService.getCharts(childId);
        const recent = await analytics_service_js_1.AnalyticsService.getRecentActivities(childId, 10);
        res.json({
            overview,
            charts,
            recent
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching child analytics', error: error.message });
    }
});
// Teacher Class Overview
app.get('/api/analytics/teacher/:teacherId/overview', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const overview = await analytics_service_js_1.AnalyticsService.getTeacherOverview(teacherId);
        res.json(overview);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching teacher analytics', error: error.message });
    }
});
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Analytics Service running on http://localhost:${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map