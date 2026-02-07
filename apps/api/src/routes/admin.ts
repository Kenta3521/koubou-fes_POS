import { Router } from 'express';
import { authenticate, requireSystemAdmin } from '../middlewares/auth.js';
import {
    getOrganizationList,
    getOrganizationSalesList,
    listAllRoles,
    createRoleSystem,
    updateRoleSystem,
    deleteRoleSystem,
    fetchAllPermissions,
    updatePermission
} from '../controllers/adminController.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireSystemAdmin);

// GET /api/v1/admin/organizations/list
router.get('/organizations/list', getOrganizationList);

// GET /api/v1/admin/organizations/sales
router.get('/organizations/sales', getOrganizationSalesList);

// Role Management (System/Global)
router.get('/roles', listAllRoles);
router.post('/roles', createRoleSystem);
router.put('/roles/:roleId', updateRoleSystem);
router.delete('/roles/:roleId', deleteRoleSystem);

// Permission Management
router.get('/permissions', fetchAllPermissions);
router.put('/permissions/:id', updatePermission);

export default router;
