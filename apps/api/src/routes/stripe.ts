/**
 * Stripe Terminal Routes
 * iOS-3-003 ~ iOS-3-005
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
    createConnectionToken,
    createPaymentIntent,
    cancelPaymentIntent,
} from '../controllers/stripeController.js';

const router: Router = Router();

// POST /api/v1/stripe/connection-token
// Stripe Terminal SDK 初期化用トークン
router.post('/connection-token', authenticate, createConnectionToken);

// POST /api/v1/stripe/create-payment-intent
// タップ決済用 PaymentIntent 作成
// Body: { orgId, transactionId }
router.post('/create-payment-intent', authenticate, createPaymentIntent);

// POST /api/v1/stripe/cancel-payment-intent
// PaymentIntent キャンセル
// Body: { paymentIntentId }
router.post('/cancel-payment-intent', authenticate, cancelPaymentIntent);

export default router;
