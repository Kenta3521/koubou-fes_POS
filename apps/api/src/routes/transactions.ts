/**
 * Transaction Routes
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { calculate, createTransaction, completeCashPayment } from '../controllers/transactionController.js';

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

export default router;
