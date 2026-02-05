/**
 * Transaction Routes
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { calculate, createTransaction, completeCashPayment, createPayPayPayment, cancelTransaction, checkPayPayStatus } from '../controllers/transactionController.js';

const router: Router = Router({ mergeParams: true });

// POST /api/v1/organizations/:orgId/transactions/calculate
// Calculate order totals and preview discounts
router.post('/calculate', authenticate, calculate);

// POST /api/v1/organizations/:orgId/transactions
// Create a new transaction
router.post('/', authenticate, createTransaction);

// POST /api/v1/organizations/:orgId/transactions/:id/complete-cash
// Complete cash payment (P2-021)
router.post('/:id/complete-cash', authenticate, completeCashPayment);

// POST /api/v1/organizations/:orgId/transactions/:id/paypay/create
// Create PayPay QR code (P3-004)
router.post('/:id/paypay/create', authenticate, createPayPayPayment);

// POST /api/v1/organizations/:orgId/transactions/:id/cancel
// Cancel transaction (P3-011)
router.post('/:id/cancel', authenticate, cancelTransaction);

// GET /api/v1/organizations/:orgId/transactions/:id/paypay/status
// Check PayPay payment status (P3-016)
router.get('/:id/paypay/status', authenticate, checkPayPayStatus);

export default router;
