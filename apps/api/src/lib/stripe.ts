import Stripe from 'stripe';

/**
 * Stripe SDK Client Initialization
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover',
});

export { stripe };
export default stripe;
