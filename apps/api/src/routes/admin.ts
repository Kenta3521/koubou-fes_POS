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
    updatePermission,
    listRoleMembersSystem,
    addRoleMemberSystem,
    removeRoleMemberSystem,
    listUsersSystem
} from '../controllers/adminController.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireSystemAdmin);

// GET /api/v1/admin/organizations/list
router.get('/organizations/list', getOrganizationList);

// GET /api/v1/admin/organizations/sales
router.get('/organizations/sales', getOrganizationSalesList);

// Role Management (System/Global)
router.get('/users', listUsersSystem);
router.get('/roles', listAllRoles);
router.post('/roles', createRoleSystem);
router.put('/roles/:roleId', updateRoleSystem);
router.delete('/roles/:roleId', deleteRoleSystem);
router.get('/roles/:roleId/members', listRoleMembersSystem);
router.post('/roles/:roleId/members', addRoleMemberSystem);
router.delete('/roles/:roleId/members/:userId', removeRoleMemberSystem);

// Permission Management
router.get('/permissions', fetchAllPermissions);
router.put('/permissions/:id', updatePermission);

// Audit Logs
import { getSystemAuditLogs } from '../controllers/auditController.js';
router.get('/audit-logs', getSystemAuditLogs);

export default router;
