/**
 * Organization Routes
 * Phase 2: 団体関連API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { listOrganizations } from '../controllers/organizationController.js';
import categoryRoutes from './categories.js';
import productRoutes from './products.js';
import discountRoutes from './discounts.js';
import transactionRoutes from './transactions.js';

const router: Router = Router();

// GET /api/v1/organizations
router.get('/', authenticate, listOrganizations);

// Nested Routes
// GET /api/v1/organizations/:orgId/categories
router.use('/:orgId/categories', categoryRoutes);

// GET /api/v1/organizations/:orgId/products
router.use('/:orgId/products', productRoutes);

// GET /api/v1/organizations/:orgId/discounts
router.use('/:orgId/discounts', discountRoutes);

// Transaction Routes
router.use('/:orgId/transactions', transactionRoutes);

export default router;
