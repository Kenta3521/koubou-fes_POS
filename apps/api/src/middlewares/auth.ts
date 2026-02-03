/**
 * 認証ミドルウェア
 * Phase 1: P1-013 認証ミドルウェア実装
 * JWT Bearer Token検証
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import prisma from '../utils/prisma.js';
import { Role, UserStatus } from '@koubou-fes-pos/shared';

/**
 * JWT認証ミドルウェア
 * Authorizationヘッダーからトークンを取得し、検証する
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // 1. Authorizationヘッダーチェック
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_TOKEN_MISSING',
                    message: '認証トークンが提供されていません',
                },
            });
            return;
        }

        // 2. Bearer形式チェック
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_INVALID_TOKEN_FORMAT',
                    message: 'トークン形式が不正です',
                },
            });
            return;
        }

        const token = parts[1];

        // 3. JWT検証
        let payload;
        try {
            payload = verifyToken(token);
        } catch (error) {
            // JWT検証エラー（無効または期限切れ）
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('expired')) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTH_TOKEN_EXPIRED',
                        message: 'トークンの有効期限が切れています',
                    },
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTH_INVALID_TOKEN',
                        message: '無効なトークンです',
                    },
                });
            }
            return;
        }

        // 4. ユーザー情報取得
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                organizations: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_USER_NOT_FOUND',
                    message: 'ユーザーが見つかりません',
                },
            });
            return;
        }

        // 5. req.userに格納
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status as UserStatus,
            isSystemAdmin: user.isSystemAdmin,
            createdAt: user.createdAt,
            organizations: user.organizations.map((uo) => ({
                id: uo.organization.id,
                name: uo.organization.name,
                role: uo.role as Role,
            })),
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'サーバーエラーが発生しました',
            },
        });
    }
}

/**
 * システム管理者専用ミドルウェア
 * authenticateの後に使用する
 */
export function requireSystemAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (!req.user?.isSystemAdmin) {
        res.status(403).json({
            success: false,
            error: {
                code: 'PERMISSION_DENIED',
                message: '管理者権限が必要です',
            },
        });
        return;
    }
    next();
}
