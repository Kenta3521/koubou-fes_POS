
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/permission.js';
import { getMembers, updateMember, deleteMember } from '../controllers/memberController.js';

const router: Router = Router({ mergeParams: true });

// すべてのルートで認証と管理者権限が必要
router.use(authenticate);
/**
 * GET /api/v1/organizations/:orgId/members
 * メンバー一覧取得
 */
router.get('/', checkPermission('read', 'member'), getMembers);

/**
 * PATCH /api/v1/organizations/:orgId/members/:userId
 * メンバーの役割変更・承認
 */
router.patch('/:userId', checkPermission('update', 'member'), updateMember);

/**
 * DELETE /api/v1/organizations/:orgId/members/:userId
 * メンバーの削除
 */
router.delete('/:userId', checkPermission('delete', 'member'), deleteMember);

export default router;
