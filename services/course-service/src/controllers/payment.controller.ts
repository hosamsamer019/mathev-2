import { Request, Response } from 'express';
import { getPaymentProvider, listAvailableProviders } from '../services/payment/index.js';
import { db } from '../../../../packages/database/src/index.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

/**
 * POST /api/payments/create
 * Body: { provider, courseId, amount }
 */
export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { provider: providerName, courseId, amount } = req.body;
    const userId = req.user?.userId;
    const userEmail = req.user?.email || '';
    const userName = (req.user as any)?.name || 'Student';

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!providerName || !courseId || !amount) {
      return res.status(400).json({ message: 'Missing required fields: provider, courseId, amount' });
    }

    const provider = getPaymentProvider(providerName);

    // Create payment intent on the external provider
    const intent = await provider.createPaymentIntent({
      amount,
      currency: 'EGP',
      userId,
      courseId,
      customerEmail: userEmail,
      customerName: userName,
    });

    // Record in database
    const payment = await (db as any).payment.create({
      data: {
        userId,
        amount,
        currency: 'EGP',
        status: 'PENDING',
        provider: providerName,
        providerOrderId: intent.providerOrderId,
        courseId,
      },
    });

    res.status(200).json({
      paymentId: payment.id,
      redirectUrl: intent.redirectUrl,
      clientSecret: intent.clientSecret,
      provider: providerName,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Payment creation failed', error: error.message });
  }
};

/**
 * POST /api/payments/webhook/:provider
 * Receives callbacks from payment providers
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { provider: providerName } = req.params;
    const provider = getPaymentProvider(providerName);

    const payload = {
      ...req.body,
      rawBody: (req as any).rawBody,
      signature: req.headers['stripe-signature'] || req.headers['x-paymob-hmac'],
      hmac: req.query.hmac || req.body.hmac,
    };

    const verification = await provider.verifyPayment(payload);

    if (verification.success) {
      // Update payment status using a transaction to prevent race conditions
      await (db as any).$transaction(async (tx: any) => {
        const payment = await tx.payment.findFirst({
          where: { providerOrderId: verification.providerOrderId },
        });

        if (payment && payment.status !== 'COMPLETED') {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED' },
          });

          // Auto-enroll student in the course
          if (payment.courseId) {
            await tx.courseEnrollment.upsert({
              where: {
                studentId_courseId: {
                  studentId: payment.userId,
                  courseId: payment.courseId,
                },
              },
              update: {},
              create: {
                studentId: payment.userId,
                courseId: payment.courseId,
              },
            });
          }
        }
      });

      res.status(200).json({ received: true });
    } else {
      // Mark as failed
      const payment = await (db as any).payment.findFirst({
        where: { providerOrderId: verification.providerOrderId },
      });
      if (payment) {
        await (db as any).payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }
      res.status(200).json({ received: true, verified: false });
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ message: 'Webhook failed' });
  }
};

/**
 * GET /api/payments/providers
 * Returns list of configured payment providers
 */
export const getProviders = (_req: Request, res: Response) => {
  res.json({ providers: listAvailableProviders() });
};

/**
 * GET /api/payments/history
 * Returns payment history for the authenticated user
 */
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const payments = await (db as any).payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
};
