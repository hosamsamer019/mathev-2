/**
 * Payment Provider Interface
 * 
 * All payment providers (Paymob, Fawry, Stripe) must implement this interface.
 * This enables hot-swapping providers without changing business logic.
 */

export interface PaymentIntent {
  providerOrderId: string;
  redirectUrl?: string;     // For redirect-based flows (Paymob, Fawry)
  clientSecret?: string;    // For Stripe Elements
  provider: string;
}

export interface PaymentVerification {
  success: boolean;
  providerOrderId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IPaymentProvider {
  name: string;
  
  /**
   * Create a payment intent / order on the provider.
   */
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    courseId: string;
    customerEmail: string;
    customerName: string;
  }): Promise<PaymentIntent>;

  /**
   * Verify a payment callback / webhook from the provider.
   */
  verifyPayment(payload: any): Promise<PaymentVerification>;
}
