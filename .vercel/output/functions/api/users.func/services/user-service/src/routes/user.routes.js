"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const parent_service_js_1 = require("../services/parent.service.js");
const billing_service_js_1 = require("../services/billing.service.js");
const router = (0, express_1.Router)();
router.get('/profile', auth_middleware_js_1.verifyToken, (req, res) => {
    res.json({
        message: 'Profile retrieved successfully',
        user: req.user
    });
});
// Parent Portal Routes
router.get('/parent/children', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const children = await parent_service_js_1.ParentService.getChildren(userId);
        res.json(children);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching children', error: error.message });
    }
});
router.post('/parent/children/link', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { childId } = req.body;
        if (!userId || !childId)
            return res.status(400).json({ message: 'Missing userId or childId' });
        await parent_service_js_1.ParentService.linkChild(userId, childId);
        res.json({ success: true, message: 'Child linked successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error linking child', error: error.message });
    }
});
// Billing Routes
router.get('/subscription', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ message: 'Unauthorized' });
        const sub = await billing_service_js_1.BillingService.getSubscription(userId);
        res.json(sub);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching subscription', error: error.message });
    }
});
router.post('/subscription/checkout', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { planId, amount } = req.body;
        if (!userId || !planId || !amount)
            return res.status(400).json({ message: 'Missing parameters' });
        const result = await billing_service_js_1.BillingService.createPaymentIntent(userId, planId, amount);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Checkout error', error: error.message });
    }
});
router.post('/subscription/verify', auth_middleware_js_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { transactionId, planId } = req.body;
        if (!userId || !transactionId || !planId)
            return res.status(400).json({ message: 'Missing parameters' });
        const result = await billing_service_js_1.BillingService.verifyAndActivateSubscription(transactionId, planId, userId);
        res.json({ success: true, subscription: result });
    }
    catch (error) {
        res.status(500).json({ message: 'Verification error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map