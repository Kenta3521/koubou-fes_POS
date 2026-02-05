/**
 * Category Controller
 * Phase 2: P2-001 カテゴリ一覧API
 * HTTPリクエストハンドラー
 */

import { Request, Response } from 'express';
import { getCategoriesByOrganization } from '../services/categoryService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * カテゴリ一覧取得
 * GET /api/v1/organizations/:orgId/categories
 */
export async function listCategories(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;

        // 1. パラメータ検証
        if (!orgId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '団体IDが必要です',
                },
            });
            return;
        }

        // 2. 団体アクセス権限チェック
        // req.userは認証ミドルウェアで設定される
        const userOrgs = req.user?.organizations || [];
        const hasAccess = userOrgs.some((org) => org.id === orgId);

        if (!hasAccess && !req.user?.isSystemAdmin) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'AUTH_FORBIDDEN',
                    message: 'この団体へのアクセス権限がありません',
                },
            });
            return;
        }

        // 3. カテゴリ取得
        const categories = await getCategoriesByOrganization(orgId);

        // 4. レスポンス
        res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'カテゴリの取得に失敗しました',
            },
        });
    }
}
