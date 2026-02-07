import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as dashboardController from '../controllers/dashboardController.js';

import { checkPermission } from '../middlewares/permission.js';

const router: Router = Router({ mergeParams: true });

// 全てのエンドポイントに認証が必要
// Phase B: RBAC checkPermissionを利用
router.use(authenticate, checkPermission('read', 'dashboard'));

// GET /api/v1/organizations/:orgId/dashboard/summary
router.get('/summary', dashboardController.getSummary);

// GET /api/v1/organizations/:orgId/dashboard/trends
router.get('/trends', dashboardController.getTrends);

// GET /api/v1/organizations/:orgId/dashboard/category-sales
router.get('/category-sales', dashboardController.getCategorySales);

// GET /api/v1/organizations/:orgId/dashboard/inventory
router.get('/inventory', dashboardController.getInventoryStatus);

// GET /api/v1/organizations/:orgId/dashboard/health
router.get('/health', dashboardController.getHealth);

export default router;
