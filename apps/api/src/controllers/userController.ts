/**
 * ユーザーコントローラー
 * Phase 1: P1-013 認証ミドルウェア実装
 * ユーザー関連のエンドポイント処理
 */

import { Request, Response } from 'express';
import { updateProfile, joinOrganization as joinOrgService, leaveOrganization as leaveOrgService } from '../services/userService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

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

/**
 * プロフィール更新
 * PATCH /api/v1/users/me
 */
export async function updateMe(req: Request, res: Response): Promise<void> {
    try {
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

        const { name, email } = req.body;
        const updatedUser = await updateProfile(req.user.id, { name, email });

        res.status(200).json({
            success: true,
            data: updatedUser,
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case 'EMAIL_ALREADY_EXISTS':
                    res.status(409).json({
                        success: false,
                        error: {
                            code: 'EMAIL_ALREADY_EXISTS',
                            message: 'このメールアドレスは既に使用されています',
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
                    logger.error('Update profile error:', error);
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
 * 団体参加（招待コード）
 * POST /api/v1/users/me/organizations
 */
export async function joinOrganization(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_UNAUTHORIZED',
                    message: '認証が必要です',
                },
            });
            return;
        }

        const { inviteCode } = req.body;

        // サービス呼び出し
        const result = await joinOrgService(userId, inviteCode);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case 'ORG_INVALID_INVITE_CODE':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'ORG_INVALID_INVITE_CODE',
                            message: '招待コードが無効です',
                        },
                    });
                    break;
                case 'ORG_INACTIVE':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'ORG_INACTIVE',
                            message: 'この団体は現在無効です',
                        },
                    });
                    break;
                case 'ORG_ALREADY_JOINED':
                    res.status(409).json({
                        success: false,
                        error: {
                            code: 'ORG_ALREADY_JOINED',
                            message: '既にこの団体に参加しています',
                        },
                    });
                    break;
                default:
                    logger.error('Join organization error:', error);
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
 * 団体からの脱退
 * DELETE /api/v1/users/me/organizations/:organizationId
 */
export async function leaveOrganization(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_UNAUTHORIZED',
                    message: '認証が必要です',
                },
            });
            return;
        }

        const { organizationId } = req.params;
        if (!organizationId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '団体IDが必要です',
                },
            });
            return;
        }

        const result = await leaveOrgService(userId, organizationId);

        res.status(200).json({
            success: true,
            data: {
                message: '脱退しました',
                ...result,
            },
        });
    } catch (error) {
        if (error instanceof Error) {
            switch (error.message) {
                case 'ORG_NOT_FOUND':
                    res.status(404).json({
                        success: false,
                        error: {
                            code: 'ORG_NOT_FOUND',
                            message: '指定された団体に所属していないか、団体が存在しません',
                        },
                    });
                    break;
                case 'CANNOT_LEAVE_AS_LAST_ADMIN':
                    res.status(400).json({
                        success: false,
                        error: {
                            code: 'CANNOT_LEAVE_AS_LAST_ADMIN',
                            message: '団体の唯一の管理者であるため、脱退できません。他のメンバーに権限を委譲してください。',
                        },
                    });
                    break;
                default:
                    logger.error('Leave organization error:', error);
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
