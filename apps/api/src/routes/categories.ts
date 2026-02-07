/**
 * Category Routes
 * Phase 2: P2-001 カテゴリ一覧API
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/permission.js';
import { listCategories, createCategory, updateCategory, deleteCategory, reorderCategories } from '../controllers/categoryController.js';

const router: Router = Router({ mergeParams: true }); // mergeParams: 親ルートのパラメータを継承

// GET /api/v1/organizations/:orgId/categories
// 団体内のカテゴリ一覧取得
router.get('/', authenticate, checkPermission(['read', 'read_pos'], 'category'), listCategories);

// POST /api/v1/organizations/:orgId/categories
router.post('/', authenticate, checkPermission('create', 'category'), createCategory);

// PATCH /api/v1/organizations/:orgId/categories/reorder
router.patch('/reorder', authenticate, checkPermission('update', 'category'), reorderCategories);

// PATCH /api/v1/organizations/:orgId/categories/:categoryId
router.patch('/:categoryId', authenticate, checkPermission('update', 'category'), updateCategory);

// DELETE /api/v1/organizations/:orgId/categories/:categoryId
router.delete('/:categoryId', authenticate, checkPermission('delete', 'category'), deleteCategory);

export default router;
