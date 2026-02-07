
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/permission.js';
import { listRoles, createRole, updateRole, deleteRole, listRoleMembers, assignRoleToMember, removeRoleFromMember } from '../controllers/roleController.js';

const router: Router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// GET /api/v1/organizations/:orgId/roles
router.get('/', checkPermission('read', 'role'), listRoles);

// POST /api/v1/organizations/:orgId/roles
router.post('/', checkPermission('create', 'role'), createRole);

// PUT /api/v1/organizations/:orgId/roles/:roleId
router.put('/:roleId', checkPermission('update', 'role'), updateRole);

// DELETE /api/v1/organizations/:orgId/roles/:roleId
router.delete('/:roleId', checkPermission('delete', 'role'), deleteRole);

// Member Assignment routes
// GET /api/v1/organizations/:orgId/roles/:roleId/members
router.get('/:roleId/members', checkPermission('read', 'role'), listRoleMembers);

// POST /api/v1/organizations/:orgId/roles/:roleId/members
router.post('/:roleId/members', checkPermission('update', 'role'), assignRoleToMember);

// DELETE /api/v1/organizations/:orgId/roles/:roleId/members/:userId
router.delete('/:roleId/members/:userId', checkPermission('update', 'role'), removeRoleFromMember);

export default router;
