/**
 * Category Routes
 * Phase 2: P2-001 カテゴリ一覧API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { listCategories } from '../controllers/categoryController.js';

const router: Router = Router({ mergeParams: true }); // mergeParams: 親ルートのパラメータを継承


// GET /api/v1/organizations/:orgId/categories
router.get('/', authenticate, listCategories);

export default router;
