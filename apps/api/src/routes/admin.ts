import { Router } from 'express';
import { authenticate, requireSystemAdmin } from '../middlewares/auth.js';
import { getOrganizationList, getOrganizationSalesList } from '../controllers/adminController.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireSystemAdmin);

// GET /api/v1/admin/organizations/list
router.get('/organizations/list', getOrganizationList);

// GET /api/v1/admin/organizations/sales
router.get('/organizations/sales', getOrganizationSalesList);

export default router;
