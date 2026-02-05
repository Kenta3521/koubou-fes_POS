/**
 * Product Routes
 * Phase 2: P2-002, P2-003 商品API
 */

import { Router } from 'express';
import { authenticate, requireOrgRole } from '../middlewares/auth.js';
import { Role } from '@koubou-fes-pos/shared';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';

const router: Router = Router({ mergeParams: true }); // mergeParams: 親ルートのパラメータを継承

// GET /api/v1/organizations/:orgId/products
router.get('/', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), listProducts);

// POST /api/v1/organizations/:orgId/products
router.post('/', authenticate, requireOrgRole([Role.ADMIN]), createProduct);

// GET /api/v1/organizations/:orgId/products/:productId
router.get('/:productId', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), getProduct);

// PATCH /api/v1/organizations/:orgId/products/:productId
router.patch('/:productId', authenticate, requireOrgRole([Role.ADMIN]), updateProduct);

// DELETE /api/v1/organizations/:orgId/products/:productId
router.delete('/:productId', authenticate, requireOrgRole([Role.ADMIN]), deleteProduct);


export default router;
