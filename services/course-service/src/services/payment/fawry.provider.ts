/**
 * Fawry Payment Provider
 * 
 * Egypt-focused payment gateway supporting:
 * - Fawry reference code (pay at any Fawry outlet)
 * - Credit/Debit cards
 * 
 * Flow:
 * 1. Create charge request with hashed signature
 * 2. User receives a reference number
 * 3. User pays at any Fawry retail point or via Fawry app
 * 4. Fawry sends server-to-server callback
 */
import { IPaymentProvider, PaymentIntent, PaymentVerification } from './payment.interface.js';
import crypto from 'crypto';

const FAWRY_MERCHANT_CODE = process.env.FAWRY_MERCHANT_CODE;
const FAWRY_SECURITY_KEY = process.env.FAWRY_SECURITY_KEY;
const FAWRY_BASE_URL = process.env.FAWRY_BASE_URL || 'https://atfawry.fawrystaging.com'; // staging

export class FawryProvider implements IPaymentProvider {
  name = 'fawry';

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    courseId: string;
    customerEmail: string;
    customerName: string;
  }): Promise<PaymentIntent> {
    const merchantRefNum = `ALSADEN_${params.userId}_${Date.now()}`;
    const itemCode = `COURSE_${params.courseId}`;

    // Fawry requires SHA-256 signature
    const signatureString = [
      FAWRY_MERCHANT_CODE,
      merchantRefNum,
      params.customerEmail,
      'PAYATFAWRY',
      params.amount.toFixed(2),
      itemCode,
      '1', // quantity
      FAWRY_SECURITY_KEY,
    ].join('');

    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const chargeRequest = {
      merchantCode: FAWRY_MERCHANT_CODE,
      merchantRefNum,
      customerProfileId: params.userId,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      paymentMethod: 'PAYATFAWRY',
      chargeItems: [{
        itemId: itemCode,
        description: `AL-SADEN Course Enrollment`,
        price: params.amount,
        quantity: 1,
      }],
      signature,
      returnUrl: `${process.env.CLIENT_URL}/payment/callback?provider=fawry`,
    };

    const res = await fetch(`${FAWRY_BASE_URL}/ECommerceWeb/Fawry/payments/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chargeRequest),
    });
    const data = await res.json();

    return {
      providerOrderId: data.referenceNumber || merchantRefNum,
      redirectUrl: data.redirectUrl,
      provider: this.name,
    };
  }

  async verifyPayment(payload: any): Promise<PaymentVerification> {
    // Fawry callback verification
    const expectedSignature = crypto
      .createHash('sha256')
      .update(`${FAWRY_MERCHANT_CODE}${payload.merchantRefNumber}${payload.fawryRefNumber}${payload.orderAmount}${payload.orderStatus}${FAWRY_SECURITY_KEY}`)
      .digest('hex');

    return {
      success: payload.orderStatus === 'PAID' && expectedSignature === payload.messageSignature,
      providerOrderId: payload.fawryRefNumber || '',
      amount: payload.orderAmount || 0,
      currency: 'EGP',
    };
  }
}
