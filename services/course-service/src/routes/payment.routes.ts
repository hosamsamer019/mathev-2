import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { createPayment, handleWebhook, getProviders, getPaymentHistory } from '../controllers/payment.controller.js';

const router = express.Router();

// Authenticated routes
router.post('/create', verifyToken, createPayment);
router.get('/providers', verifyToken, getProviders);
router.get('/history', verifyToken, getPaymentHistory);

// Webhook routes (no auth — called by payment providers)
router.post('/webhook/:provider', handleWebhook);

export default router;
