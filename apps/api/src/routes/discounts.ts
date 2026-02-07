/**
 * Discount Routes
 * Phase 2: P2-010 割引一覧API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/permission.js';
import * as discountController from '../controllers/discountController.js';
import { createDiscount, updateDiscount, deleteDiscount } from '../controllers/discountController.js';

const router: Router = Router({ mergeParams: true });

// GET /api/v1/organizations/:orgId/discounts
router.get('/', authenticate, checkPermission(['read', 'read_pos'], 'discount'), discountController.getDiscounts);

// POST /api/v1/organizations/:orgId/discounts
router.post('/', authenticate, checkPermission('create', 'discount'), createDiscount);

// PATCH /api/v1/organizations/:orgId/discounts/:id
router.patch('/:id', authenticate, checkPermission('update', 'discount'), updateDiscount);

// DELETE /api/v1/organizations/:orgId/discounts/:id
router.delete('/:id', authenticate, checkPermission('delete', 'discount'), deleteDiscount);



export default router;
