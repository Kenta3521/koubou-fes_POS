/**
 * Transaction Routes
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/permission.js';
import { calculate, createTransaction, completeCashPayment, createPayPayPayment, cancelTransaction, checkPayPayStatus, getTransactions, getTransactionDetail } from '../controllers/transactionController.js';

const router: Router = Router({ mergeParams: true });

// GET /api/v1/organizations/:orgId/transactions
// Get transaction history (P4-028)
router.get('/', authenticate, checkPermission('read', 'transaction'), getTransactions);

// GET /api/v1/organizations/:orgId/transactions/:id
// Get transaction detail (P4-029)
router.get('/:id', authenticate, checkPermission('read', 'transaction'), getTransactionDetail);

// POST /api/v1/organizations/:orgId/transactions/calculate
// Calculate order totals and preview discounts
router.post('/calculate', authenticate, checkPermission('create', 'transaction'), calculate);

// POST /api/v1/organizations/:orgId/transactions
// Create a new transaction
router.post('/', authenticate, checkPermission('create', 'transaction'), createTransaction);

// POST /api/v1/organizations/:orgId/transactions/:id/complete-cash
// Complete cash payment (P2-021)
router.post('/:id/complete-cash', authenticate, checkPermission('create', 'transaction'), completeCashPayment);

// POST /api/v1/organizations/:orgId/transactions/:id/complete-tap-to-pay
// Complete Tap to Pay on iPhone (Stripe) payment
import { completeTapToPay } from '../controllers/transactionController.js';
router.post('/:id/complete-tap-to-pay', authenticate, checkPermission('create', 'transaction'), completeTapToPay);

// POST /api/v1/organizations/:orgId/transactions/:id/paypay/create
// Create PayPay QR code (P3-004)
router.post('/:id/paypay/create', authenticate, checkPermission('create', 'transaction'), createPayPayPayment);

// POST /api/v1/organizations/:orgId/transactions/:id/cancel
// Cancel transaction (P3-011)
router.post('/:id/cancel', authenticate, checkPermission('cancel', 'transaction'), cancelTransaction);

// GET /api/v1/organizations/:orgId/transactions/:id/paypay/status
// Check PayPay payment status (P3-016)
router.get('/:id/paypay/status', authenticate, checkPermission(['read', 'create'], 'transaction'), checkPayPayStatus);


export default router;
