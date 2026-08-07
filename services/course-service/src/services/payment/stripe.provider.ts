/**
 * Stripe Payment Provider
 * 
 * International payment gateway for future expansion.
 * Supports: Credit/Debit cards, Apple Pay, Google Pay.
 *
 * Flow:
 * 1. Create PaymentIntent on Stripe
 * 2. Return clientSecret to frontend for Stripe Elements
 * 3. Stripe sends webhook on payment completion
 */
import { IPaymentProvider, PaymentIntent, PaymentVerification } from './payment.interface.js';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' as any });
}

export class StripeProvider implements IPaymentProvider {
  name = 'stripe';

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    courseId: string;
    customerEmail: string;
    customerName: string;
  }): Promise<PaymentIntent> {
    if (!stripe) throw new Error('Stripe is not configured');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Stripe uses cents
      currency: params.currency.toLowerCase(),
      metadata: {
        userId: params.userId,
        courseId: params.courseId,
        platform: 'alsaden',
      },
      receipt_email: params.customerEmail,
    });

    return {
      providerOrderId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      provider: this.name,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerification> {
    if (!stripe) throw new Error('Stripe is not configured');

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      payload.rawBody,
      payload.signature,
      STRIPE_WEBHOOK_SECRET || ''
    );

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        success: true,
        providerOrderId: intent.id,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
        metadata: intent.metadata,
      };
    }

    return {
      success: false,
      providerOrderId: '',
      amount: 0,
      currency: 'USD',
    };
  }
}
