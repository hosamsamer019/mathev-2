/**
 * Payment Gateway — Abstraction Layer
 *
 * Selects the correct provider based on the `provider` parameter.
 * This is the ONLY entry point the rest of the application uses to interact
 * with payment providers. Swap or add providers without touching business logic.
 */
import { IPaymentProvider } from './payment.interface.js';
import { PaymobProvider } from './paymob.provider.js';
import { FawryProvider } from './fawry.provider.js';
import { StripeProvider } from './stripe.provider.js';

const providers: Record<string, IPaymentProvider> = {
  paymob: new PaymobProvider(),
  fawry: new FawryProvider(),
  stripe: new StripeProvider(),
};

export function getPaymentProvider(name: string): IPaymentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown payment provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}

export function listAvailableProviders(): string[] {
  // Only return providers that have their env vars configured
  const available: string[] = [];
  if (process.env.PAYMOB_API_KEY) available.push('paymob');
  if (process.env.FAWRY_MERCHANT_CODE) available.push('fawry');
  if (process.env.STRIPE_SECRET_KEY) available.push('stripe');
  return available;
}

export { IPaymentProvider } from './payment.interface.js';
