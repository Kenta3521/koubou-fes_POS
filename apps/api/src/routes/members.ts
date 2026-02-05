
import { Router } from 'express';
import { authenticate, requireOrgRole } from '../middlewares/auth.js';
import { getMembers, updateMember, deleteMember } from '../controllers/memberController.js';
import { Role } from '@koubou-fes-pos/shared';

const router: Router = Router({ mergeParams: true });

// すべてのルートで認証と管理者権限が必要
router.use(authenticate);
router.use(requireOrgRole([Role.ADMIN]));

/**
 * GET /api/v1/organizations/:orgId/members
 * メンバー一覧取得
 */
router.get('/', getMembers);

/**
 * PATCH /api/v1/organizations/:orgId/members/:userId
 * メンバーの役割変更・承認
 */
router.patch('/:userId', updateMember);

/**
 * DELETE /api/v1/organizations/:orgId/members/:userId
 * メンバーの削除
 */
router.delete('/:userId', deleteMember);

export default router;
