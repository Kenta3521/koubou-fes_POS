/**
 * Transaction Routes
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { calculate } from '../controllers/transactionController.js';

const router: Router = Router({ mergeParams: true });

// POST /api/v1/organizations/:orgId/transactions/calculate
// Calculate order totals and preview discounts
router.post('/calculate', authenticate, calculate);

export default router;
