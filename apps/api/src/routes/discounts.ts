/**
 * Discount Routes
 * Phase 2: P2-010 割引一覧API
 */

import { Router } from 'express';
import { authenticate, requireOrgRole } from '../middlewares/auth.js';
import { Role } from '@koubou-fes-pos/shared';
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount } from '../controllers/discountController.js';

const router: Router = Router({ mergeParams: true });

// GET /api/v1/organizations/:orgId/discounts
router.get('/', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), getDiscounts);

// POST /api/v1/organizations/:orgId/discounts
router.post('/', authenticate, requireOrgRole([Role.ADMIN]), createDiscount);

// PATCH /api/v1/organizations/:orgId/discounts/:id
router.patch('/:id', authenticate, requireOrgRole([Role.ADMIN]), updateDiscount);

// DELETE /api/v1/organizations/:orgId/discounts/:id
router.delete('/:id', authenticate, requireOrgRole([Role.ADMIN]), deleteDiscount);



export default router;
