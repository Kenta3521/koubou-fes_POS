
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { listPermissions } from '../controllers/roleController.js';

const router: Router = Router();

// GET /api/v1/permissions
// 認証済みユーザーなら誰でも閲覧可能（ロール編集画面などで使用）
router.get('/', authenticate, listPermissions);

export default router;
