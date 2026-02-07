/**
 * Product Routes
 * Phase 2: P2-002, P2-003 商品API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/permission.js';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';

const router: Router = Router({ mergeParams: true }); // mergeParams: 親ルートのパラメータを継承

// GET /api/v1/organizations/:orgId/products
router.get('/', authenticate, checkPermission('read', 'product'), listProducts);

// POST /api/v1/organizations/:orgId/products
router.post('/', authenticate, checkPermission('create', 'product'), createProduct);

// GET /api/v1/organizations/:orgId/products/:productId
router.get('/:productId', authenticate, checkPermission('read', 'product'), getProduct);

// PATCH /api/v1/organizations/:orgId/products/:productId
router.patch('/:productId', authenticate, checkPermission('update', 'product'), updateProduct);

// DELETE /api/v1/organizations/:orgId/products/:productId
router.delete('/:productId', authenticate, checkPermission('delete', 'product'), deleteProduct);


export default router;
