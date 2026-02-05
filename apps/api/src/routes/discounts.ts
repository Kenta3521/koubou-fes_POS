/**
 * Discount Routes
 * Phase 2: P2-010 割引一覧API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getDiscounts } from '../controllers/discountController.js';

const router: Router = Router({ mergeParams: true });

// GET /api/v1/organizations/:orgId/discounts
router.get('/', authenticate, getDiscounts);

export default router;
