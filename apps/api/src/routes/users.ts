/**
 * ユーザールーター
 * Phase 1: P1-013 認証ミドルウェア実装
 * ユーザー関連のエンドポイント定義
 */

import { Router, type IRouter } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { getCurrentUser } from '../controllers/userController.js';

const router: IRouter = Router();

/**
 * GET /api/v1/users/me
 * 現在ログイン中のユーザー情報取得
 */
router.get('/me', authenticate, getCurrentUser);

export default router;
