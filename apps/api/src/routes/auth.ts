/**
 * 認証ルーター
 * Phase 1: P1-011 ログインAPI実装
 * 認証関連のエンドポイント定義
 */

import { Router, type IRouter } from 'express';
import { body } from 'express-validator';
import { login, register } from '../controllers/authController.js';

const router: IRouter = Router();

/**
 * POST /api/v1/auth/login
 * ログインエンドポイント
 */
router.post(
    '/login',
    [
        // バリデーション
        body('email')
            .isEmail()
            .withMessage('有効なメールアドレスを入力してください')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('パスワードを入力してください')
            .isLength({ min: 1 })
            .withMessage('パスワードを入力してください'),
    ],
    login
);

/**
 * POST /api/v1/auth/register
 * 登録エンドポイント
 */
router.post(
    '/register',
    [
        // バリデーション
        body('email')
            .isEmail()
            .withMessage('有効なメールアドレスを入力してください')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('パスワードを入力してください')
            .isLength({ min: 8 })
            .withMessage('パスワードは8文字以上である必要があります'),
        body('name')
            .notEmpty()
            .withMessage('名前を入力してください')
            .isLength({ min: 1 })
            .withMessage('名前を入力してください'),
        body('inviteCode')
            .notEmpty()
            .withMessage('招待コードを入力してください'),
    ],
    register
);

export default router;
