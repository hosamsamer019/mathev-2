import { db } from '@smartmath/database';

interface StripeProvider {
  createPaymentIntent(amount: number, currency: string): Promise<{ id: string; clientSecret: string }>;
  verifyPayment(transactionId: string): Promise<boolean>;
}

class MockStripeProvider implements StripeProvider {
  async createPaymentIntent(amount: number, currency: string) {
    return {
      id: `pi_${Math.random().toString(36).substr(2, 9)}`,
      clientSecret: `secret_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  async verifyPayment(transactionId: string) {
    return true; // Assume success for mock
  }
}

const stripe = new MockStripeProvider();

export class BillingService {
  static async getSubscription(userId: string) {
    const sub = await db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!sub) return { status: 'none' };
    const isExpired = new Date() > sub.expiresAt;
    
    return {
      id: sub.id,
      planId: sub.planId,
      status: isExpired ? 'past_due' : sub.status,
      expiresAt: sub.expiresAt,
      isExpired
    };
  }

  static async createPaymentIntent(userId: string, planId: string, amount: number) {
    const intent = await stripe.createPaymentIntent(amount, 'EGP');

    const payment = await db.payment.create({
      data: {
        userId,
        provider: 'stripe',
        transactionId: intent.id,
        amount,
        currency: 'EGP',
        status: 'PENDING'
      }
    });

    return {
      paymentId: payment.id,
      transactionId: payment.transactionId,
      clientSecret: intent.clientSecret
    };
  }

  static async verifyAndActivateSubscription(transactionId: string, planId: string, userId: string) {
    const isValid = await stripe.verifyPayment(transactionId);
    
    if (!isValid) {
      await db.payment.update({
        where: { transactionId },
        data: { status: 'FAILED' }
      });
      throw new Error('Payment verification failed');
    }

    await db.payment.update({
      where: { transactionId },
      data: { status: 'SUCCESS' }
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const sub = await db.subscription.create({
      data: {
        userId,
        planId,
        status: 'active',
        expiresAt
      }
    });

    return sub;
  }
}
