/**
 * Stripe Webhook Handler
 *
 * Activated by: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in environment
 * In dev (missing keys): route returns 503 with instructions.
 *
 * Handles:
 *   - checkout.session.completed   → mark Payment COMPLETED
 *   - payment_intent.payment_failed → mark Payment FAILED
 *   - customer.subscription.deleted → cancel subscription
 */
import { Request, Response } from 'express';
import { db } from '../../../../packages/database/src/index.js';
import { logger } from '@shared/utils';

export const stripeWebhook = async (req: Request, res: Response) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return res.status(503).json({
      message: 'Stripe integration not configured.',
      required: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
    });
  }

  let stripe: any;
  try {
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });
  } catch {
    return res.status(500).json({ message: 'Stripe SDK failed to load' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ message: 'Missing Stripe-Signature header' });

  let event: any;
  try {
    // req.body must be raw Buffer (express.raw middleware required for this route)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  logger.info(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        if (userId) {
          await db.payment.create({
            data: {
              userId,
              amount,
              status: 'COMPLETED',
              date: new Date()
            }
          });
          logger.info(`[Stripe] Payment completed for user ${userId}: $${amount}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const userId = intent.metadata?.userId;
        const amount = intent.amount ? intent.amount / 100 : 0;

        if (userId) {
          await db.payment.create({
            data: {
              userId,
              amount,
              status: 'FAILED',
              date: new Date()
            }
          });
          logger.info(`[Stripe] Payment FAILED for user ${userId}: $${amount}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Placeholder — extend when subscription model is added to schema
        logger.info('[Stripe] Subscription cancelled', { subscriptionId: event.data.object.id });
        break;
      }

      default:
        logger.info(`[Stripe] Unhandled event: ${event.type}`);
    }
  } catch (dbErr: any) {
    logger.error('[Stripe Webhook] DB error', { error: dbErr.message });
    // Acknowledge receipt to Stripe (don't retry on DB errors)
    return res.json({ received: true, warning: 'DB write failed' });
  }

  res.json({ received: true });
};
