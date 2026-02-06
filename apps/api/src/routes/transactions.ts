/**
 * Transaction Routes
 */

import { Router } from 'express';
import { authenticate, requireOrgRole } from '../middlewares/auth.js';
import { Role } from '@koubou-fes-pos/shared';
import { calculate, createTransaction, completeCashPayment, createPayPayPayment, cancelTransaction, checkPayPayStatus, getTransactions, getTransactionDetail } from '../controllers/transactionController.js';

const router: Router = Router({ mergeParams: true });

// GET /api/v1/organizations/:orgId/transactions
// Get transaction history (P4-028)
router.get('/', authenticate, requireOrgRole([Role.ADMIN]), getTransactions);

// GET /api/v1/organizations/:orgId/transactions/:id
// Get transaction detail (P4-029)
router.get('/:id', authenticate, requireOrgRole([Role.ADMIN]), getTransactionDetail);

// POST /api/v1/organizations/:orgId/transactions/calculate
// Calculate order totals and preview discounts
router.post('/calculate', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), calculate);

// POST /api/v1/organizations/:orgId/transactions
// Create a new transaction
router.post('/', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), createTransaction);

// POST /api/v1/organizations/:orgId/transactions/:id/complete-cash
// Complete cash payment (P2-021)
router.post('/:id/complete-cash', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), completeCashPayment);

// POST /api/v1/organizations/:orgId/transactions/:id/paypay/create
// Create PayPay QR code (P3-004)
router.post('/:id/paypay/create', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), createPayPayPayment);

// POST /api/v1/organizations/:orgId/transactions/:id/cancel
// Cancel transaction (P3-011)
router.post('/:id/cancel', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), cancelTransaction);

// GET /api/v1/organizations/:orgId/transactions/:id/paypay/status
// Check PayPay payment status (P3-016)
router.get('/:id/paypay/status', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), checkPayPayStatus);


export default router;
