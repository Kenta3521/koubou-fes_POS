/**
 * Product Routes
 * Phase 2: P2-002, P2-003 商品API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { listProducts, getProduct } from '../controllers/productController.js';

const router: Router = Router({ mergeParams: true }); // mergeParams: 親ルートのパラメータを継承

// GET /api/v1/organizations/:orgId/products
router.get('/', authenticate, listProducts);

// GET /api/v1/organizations/:orgId/products/:productId
router.get('/:productId', authenticate, getProduct);

export default router;
