/**
 * Paymob Payment Provider
 * 
 * Egypt-focused payment gateway supporting:
 * - Credit/Debit cards
 * - Mobile wallets (Vodafone Cash, etc.)
 * - Fawry reference codes
 * 
 * Flow:
 * 1. Authenticate → get auth token
 * 2. Create order
 * 3. Generate payment key
 * 4. Redirect user to Paymob hosted checkout
 * 5. Receive webhook callback with transaction result
 */
import { IPaymentProvider, PaymentIntent, PaymentVerification } from './payment.interface.js';
import crypto from 'crypto';

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID || '0';

export class PaymobProvider implements IPaymentProvider {
  name = 'paymob';

  private async authenticate(): Promise<string> {
    const res = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
    });
    const data = await res.json();
    return data.token;
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    courseId: string;
    customerEmail: string;
    customerName: string;
  }): Promise<PaymentIntent> {
    // 1. Authenticate
    const authToken = await this.authenticate();

    // 2. Create Order
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(params.amount * 100),
        currency: params.currency,
        merchant_order_id: `${params.userId}_${params.courseId}_${Date.now()}`,
        items: [{ name: `Course ${params.courseId}`, amount_cents: Math.round(params.amount * 100), quantity: 1 }],
      }),
    });
    const order = await orderRes.json();

    // 3. Generate Payment Key
    const [firstName, ...lastParts] = params.customerName.split(' ');
    const lastName = lastParts.join(' ') || firstName;

    const paymentKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(params.amount * 100),
        expiration: 3600,
        order_id: order.id,
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: params.customerEmail,
          phone_number: 'NA',
          apartment: 'NA', building: 'NA', floor: 'NA', street: 'NA',
          city: 'Cairo', country: 'EG', state: 'Cairo',
          shipping_method: 'NA', postal_code: 'NA',
        },
        currency: params.currency,
        integration_id: parseInt(PAYMOB_INTEGRATION_ID || '0'),
      }),
    });
    const paymentKey = await paymentKeyRes.json();

    return {
      providerOrderId: String(order.id),
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey.token}`,
      provider: this.name,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerification> {
    // Paymob sends HMAC in the callback for verification
    const hmacFields = [
      'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
      'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
      'is_standalone_payment', 'is_voided', 'order', 'owner', 'pending',
      'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
    ];

    const concatenated = hmacFields.map(f => {
      const keys = f.split('.');
      let val = payload.obj;
      for (const k of keys) val = val?.[k];
      return String(val ?? '');
    }).join('');

    const computedHmac = crypto
      .createHmac('sha512', PAYMOB_HMAC_SECRET || '')
      .update(concatenated)
      .digest('hex');

    const isValid = computedHmac === payload.hmac;

    return {
      success: isValid && payload.obj?.success === true,
      providerOrderId: String(payload.obj?.order?.id || ''),
      amount: (payload.obj?.amount_cents || 0) / 100,
      currency: payload.obj?.currency || 'EGP',
    };
  }
}
