/**
 * Category Routes
 * Phase 2: P2-001 カテゴリ一覧API
 */

import { Router } from 'express';
import { authenticate, requireOrgRole } from '../middlewares/auth.js';
import { Role } from '@koubou-fes-pos/shared';
import { listCategories, createCategory, updateCategory, deleteCategory, reorderCategories } from '../controllers/categoryController.js';

const router: Router = Router({ mergeParams: true }); // mergeParams: 親ルートのパラメータを継承


// GET /api/v1/organizations/:orgId/categories
router.get('/', authenticate, requireOrgRole([Role.ADMIN, Role.STAFF]), listCategories);

// POST /api/v1/organizations/:orgId/categories
router.post('/', authenticate, requireOrgRole([Role.ADMIN]), createCategory);

// PATCH /api/v1/organizations/:orgId/categories/reorder
router.patch('/reorder', authenticate, requireOrgRole([Role.ADMIN]), reorderCategories);

// PATCH /api/v1/organizations/:orgId/categories/:categoryId
router.patch('/:categoryId', authenticate, requireOrgRole([Role.ADMIN]), updateCategory);

// DELETE /api/v1/organizations/:orgId/categories/:categoryId
router.delete('/:categoryId', authenticate, requireOrgRole([Role.ADMIN]), deleteCategory);


export default router;
