"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const database_1 = require("@smartmath/database");
class MockStripeProvider {
    async createPaymentIntent(amount, currency) {
        return {
            id: `pi_${Math.random().toString(36).substr(2, 9)}`,
            clientSecret: `secret_${Math.random().toString(36).substr(2, 9)}`
        };
    }
    async verifyPayment(transactionId) {
        return true; // Assume success for mock
    }
}
const stripe = new MockStripeProvider();
class BillingService {
    static async getSubscription(userId) {
        const sub = await database_1.db.subscription.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        if (!sub)
            return { status: 'none' };
        const isExpired = new Date() > sub.expiresAt;
        return {
            id: sub.id,
            planId: sub.planId,
            status: isExpired ? 'past_due' : sub.status,
            expiresAt: sub.expiresAt,
            isExpired
        };
    }
    static async createPaymentIntent(userId, planId, amount) {
        const intent = await stripe.createPaymentIntent(amount, 'EGP');
        const payment = await database_1.db.payment.create({
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
    static async verifyAndActivateSubscription(transactionId, planId, userId) {
        const isValid = await stripe.verifyPayment(transactionId);
        if (!isValid) {
            await database_1.db.payment.update({
                where: { transactionId },
                data: { status: 'FAILED' }
            });
            throw new Error('Payment verification failed');
        }
        await database_1.db.payment.update({
            where: { transactionId },
            data: { status: 'SUCCESS' }
        });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const sub = await database_1.db.subscription.create({
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
exports.BillingService = BillingService;
//# sourceMappingURL=billing.service.js.map