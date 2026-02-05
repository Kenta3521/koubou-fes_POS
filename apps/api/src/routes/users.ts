/**
 * ユーザールーター
 * Phase 1: P1-013 認証ミドルウェア実装
 * ユーザー関連のエンドポイント定義
 */

import { Router, type IRouter } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getCurrentUser, updateMe, joinOrganization, leaveOrganization } from '../controllers/userController.js';

const router: IRouter = Router();

/**
 * GET /api/v1/users/me
 * 現在ログイン中のユーザー情報取得
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * PATCH /api/v1/users/me
 * プロフィール更新 (P1-025)
 */
router.patch('/me', authenticate, updateMe);

/**
 * POST /api/v1/users/me/organizations
 * 団体参加 (P1-027)
 */
router.post('/me/organizations', authenticate, joinOrganization);

/**
 * DELETE /api/v1/users/me/organizations/:organizationId
 * 団体からの脱退 (P1-029)
 */
router.delete('/me/organizations/:organizationId', authenticate, leaveOrganization);

export default router;
