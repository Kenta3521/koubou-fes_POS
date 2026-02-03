/**
 * ユーザーコントローラー
 * Phase 1: P1-013 認証ミドルウェア実装
 * ユーザー関連のエンドポイント処理
 */

import { Request, Response } from 'express';

/**
 * 現在ログイン中のユーザー情報取得
 * GET /api/v1/users/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
    // authenticateミドルウェアでreq.userが設定されている
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_TOKEN_MISSING',
                message: '認証が必要です',
            },
        });
        return;
    }

    res.status(200).json({
        success: true,
        data: req.user,
    });
}
