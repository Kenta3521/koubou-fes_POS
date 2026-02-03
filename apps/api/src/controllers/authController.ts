/**
 * 認証コントローラー
 * Phase 1: P1-011 ログインAPI実装
 * HTTPリクエスト/レスポンス処理を担当
 */


import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { loginUser, registerUser, requestPasswordReset, resetPassword } from '../services/authService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * ログインエンドポイント
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
    try {
        // バリデーションエラーチェック
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '入力値が不正です',
                    details: errors.array(),
                },
            });
            return;
        }

        const { email, password } = req.body;

        // ログイン処理
        const data = await loginUser(email, password);

        // 成功レスポンス（API設計書.md 2.1）
        res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        // エラーハンドリング（API設計書.md 14節）
        if (error instanceof Error) {
            const errorCode = error.message;

            switch (errorCode) {
                case 'AUTH_INVALID_CREDENTIALS':
                    res.status(401).json({
                        success: false,
                        error: {
                            code: 'AUTH_INVALID_CREDENTIALS',
                            message: 'メールアドレスまたはパスワードが正しくありません',
                        },
                    });
                    break;

                case 'USER_SUSPENDED':
                    res.status(403).json({
                        success: false,
                        error: {
                            code: 'USER_SUSPENDED',
                            message: 'アカウントが停止されています',
                        },
                    });
                    break;

                case 'USER_DEACTIVATED':
                    res.status(403).json({
                        success: false,
                        error: {
                            code: 'USER_DEACTIVATED',
                            message: 'アカウントが退会済みです',
                        },
                    });
                    break;

                default:
                    logger.error('Login error:', error);
                    res.status(500).json({
                        success: false,
                        error: {
                            code: 'INTERNAL_ERROR',
                            message: 'サーバーエラーが発生しました',
                        },
                    });
            }
        } else {
            logger.error('Unexpected error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'サーバーエラーが発生しました',
                },
            });
        }
    }
}

/**
 * 登録エンドポイント
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
    try {
        // バリデーションエラーチェック
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '入力値が不正です',
                    details: errors.array(),
                },
            });
            return;
        }

        const { email, password, name, inviteCode } = req.body;

        // 登録処理
        const data = await registerUser(email, password, name, inviteCode);

        // 成功レスポンス（API設計書.md 2.2）
        res.status(201).json({
            success: true,
            data,
        });
    } catch (error) {
        // エラーハンドリング（API設計書.md 14節）
        if (error instanceof Error) {
            const errorCode = error.message;

            switch (errorCode) {
                case 'ORG_INVALID_INVITE_CODE':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'ORG_INVALID_INVITE_CODE',
                            message: '招待コードが不正です',
                        },
                    });
                    break;

                case 'ORG_INACTIVE':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'ORG_INACTIVE',
                            message: '団体が無効化されています',
                        },
                    });
                    break;

                case 'EMAIL_ALREADY_EXISTS':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'EMAIL_ALREADY_EXISTS',
                            message: 'このメールアドレスは既に使用されています',
                        },
                    });
                    break;

                default:
                    logger.error('Register error:', error);
                    res.status(500).json({
                        success: false,
                        error: {
                            code: 'INTERNAL_ERROR',
                            message: 'サーバーエラーが発生しました',
                        },
                    });
            }
        } else {
            logger.error('Unexpected error:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'サーバーエラーが発生しました',
                },
            });
        }
    }
}

/**
 * リセット要求エンドポイント
 * POST /api/v1/auth/reset-password-request
 */
export async function requestReset(req: Request, res: Response): Promise<void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '入力値が不正です',
                    details: errors.array(),
                },
            });
            return;
        }

        const { email } = req.body;
        const token = await requestPasswordReset(email);

        // 開発用措置: トークンをレスポンスに含める
        res.status(200).json({
            success: true,
            message: 'パスワードリセットメールを送信しました（開発用: トークンを返却します）',
            data: { token },
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case 'USER_NOT_FOUND':
                    // セキュリティ上、本来は200 OKを返すべきだが、今回はエラーを返す
                    res.status(404).json({
                        success: false,
                        error: {
                            code: 'USER_NOT_FOUND',
                            message: 'ユーザーが見つかりません',
                        },
                    });
                    break;
                case 'USER_INACTIVE':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'USER_INACTIVE',
                            message: 'ユーザーが無効です',
                        },
                    });
                    break;
                default:
                    logger.error('Reset request error:', error);
                    res.status(500).json({
                        success: false,
                        error: {
                            code: 'INTERNAL_ERROR',
                            message: 'サーバーエラーが発生しました',
                        },
                    });
            }
        } else {
            logger.error('Unexpected error:', error);
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'サーバーエラー' },
            });
        }
    }
}

/**
 * リセット実行エンドポイント
 * POST /api/v1/auth/reset-password
 */
export async function performReset(req: Request, res: Response): Promise<void> {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '入力値が不正です',
                    details: errors.array(),
                },
            });
            return;
        }

        const { token, newPassword } = req.body;
        await resetPassword(token, newPassword);

        res.status(200).json({
            success: true,
            message: 'パスワードを変更しました',
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case 'INVALID_TOKEN_PURPOSE':
                case 'jwt expired':
                case 'jwt malformed':
                case 'invalid token':
                case 'invalid signature':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'INVALID_TOKEN',
                            message: 'トークンが無効または期限切れです',
                        },
                    });
                    break;
                case 'USER_NOT_FOUND':
                    res.status(404).json({
                        success: false,
                        error: {
                            code: 'USER_NOT_FOUND',
                            message: 'ユーザーが見つかりません',
                        },
                    });
                    break;
                default:
                    logger.error('Reset perform error:', error);
                    res.status(500).json({
                        success: false,
                        error: {
                            code: 'INTERNAL_ERROR',
                            message: 'サーバーエラーが発生しました',
                        },
                    });
            }
        } else {
            logger.error('Unexpected error:', error);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ServerError' } });
        }
    }
}
