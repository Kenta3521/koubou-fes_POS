/**
 * Organization Routes
 * Phase 2: 団体関連API
 */

import { Router } from 'express';
import { authenticate, requireSystemAdmin } from '../middlewares/auth.js';
import { listOrganizations, getOrganization, createOrganization, updateOrganization, regenerateInviteCode } from '../controllers/organizationController.js';
import categoryRoutes from './categories.js';
import productRoutes from './products.js';
import discountRoutes from './discounts.js';
import transactionRoutes from './transactions.js';
import memberRoutes from './members.js';
import dashboardRoutes from './dashboard.js';

const router: Router = Router();

// GET /api/v1/organizations
router.get('/', authenticate, listOrganizations);

// POST /api/v1/organizations (System Admin Only)
router.post('/', authenticate, requireSystemAdmin, createOrganization);

// GET /api/v1/organizations/:orgId
router.get('/:orgId', authenticate, getOrganization);

// PATCH /api/v1/organizations/:orgId (System Admin Only)
router.patch('/:orgId', authenticate, requireSystemAdmin, updateOrganization);

// POST /api/v1/organizations/:orgId/regenerate-invite (System Admin Only)
router.post('/:orgId/regenerate-invite', authenticate, requireSystemAdmin, regenerateInviteCode);

// Nested Routes
// GET /api/v1/organizations/:orgId/categories
router.use('/:orgId/categories', categoryRoutes);

// GET /api/v1/organizations/:orgId/products
router.use('/:orgId/products', productRoutes);

// GET /api/v1/organizations/:orgId/discounts
router.use('/:orgId/discounts', discountRoutes);

// Transaction Routes
router.use('/:orgId/transactions', transactionRoutes);

// Member Routes
router.use('/:orgId/members', memberRoutes);

// Dashboard Routes
router.use('/:orgId/dashboard', dashboardRoutes);

export default router;
