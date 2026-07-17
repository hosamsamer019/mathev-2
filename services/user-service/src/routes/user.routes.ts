import { Router } from 'express';
import { verifyToken, AuthRequest } from '../middlewares/auth.middleware.js';
import { ParentService } from '../services/parent.service.js';
import { BillingService } from '../services/billing.service.js';

const router = Router();

router.get('/profile', verifyToken, (req: AuthRequest, res) => {
  res.json({
    message: 'Profile retrieved successfully',
    user: req.user
  });
});

// Parent Portal Routes
router.get('/parent/children', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const children = await ParentService.getChildren(userId);
    res.json(children);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching children', error: error.message });
  }
});

router.post('/parent/children/link', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { childId } = req.body;
    if (!userId || !childId) return res.status(400).json({ message: 'Missing userId or childId' });
    
    await ParentService.linkChild(userId, childId);
    res.json({ success: true, message: 'Child linked successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error linking child', error: error.message });
  }
});

// Billing Routes
router.get('/subscription', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const sub = await BillingService.getSubscription(userId);
    res.json(sub);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching subscription', error: error.message });
  }
});

router.post('/subscription/checkout', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { planId, amount } = req.body;
    if (!userId || !planId || !amount) return res.status(400).json({ message: 'Missing parameters' });
    
    const result = await BillingService.createPaymentIntent(userId, planId, amount);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Checkout error', error: error.message });
  }
});

router.post('/subscription/verify', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { transactionId, planId } = req.body;
    if (!userId || !transactionId || !planId) return res.status(400).json({ message: 'Missing parameters' });
    
    const result = await BillingService.verifyAndActivateSubscription(transactionId, planId, userId);
    res.json({ success: true, subscription: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Verification error', error: error.message });
  }
});

export default router;
