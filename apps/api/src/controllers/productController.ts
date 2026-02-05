/**
 * Product Controller
 * Phase 2: P2-002, P2-003 商品API
 * HTTPリクエストハンドラー
 */

import { Request, Response } from 'express';
import { getProductsByOrganization, getProductById } from '../services/productService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * 商品一覧取得
 * GET /api/v1/organizations/:orgId/products
 * Query Parameters:
 *   - categoryId: カテゴリIDでフィルタ (optional)
 *   - isActive: 有効/無効でフィルタ (optional, true/false)
 */
export async function listProducts(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { categoryId, isActive } = req.query;

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

        // 2. クエリパラメータのパース
        let parsedIsActive: boolean | undefined;
        if (isActive !== undefined) {
            if (isActive === 'true') {
                parsedIsActive = true;
            } else if (isActive === 'false') {
                parsedIsActive = false;
            } else {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'isActiveはtrue/falseである必要があります',
                    },
                });
                return;
            }
        }

        // 3. 団体アクセス権限チェック
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

        // 4. 商品取得
        const products = await getProductsByOrganization(orgId, {
            categoryId: categoryId as string | undefined,
            isActive: parsedIsActive,
        });

        // 5. レスポンス
        res.status(200).json({
            success: true,
            data: products,
        });
    } catch (error) {
        logger.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '商品の取得に失敗しました',
            },
        });
    }
}

/**
 * 商品詳細取得
 * GET /api/v1/organizations/:orgId/products/:productId
 */
export async function getProduct(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, productId } = req.params;

        // 1. パラメータ検証
        if (!orgId || !productId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '団体IDと商品IDが必要です',
                },
            });
            return;
        }

        // 2. 団体アクセス権限チェック
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

        // 3. 商品取得
        const product = await getProductById(orgId, productId);

        // 4. 商品が見つからない場合
        if (!product) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: '商品が見つかりません',
                },
            });
            return;
        }

        // 5. レスポンス
        res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        logger.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '商品の取得に失敗しました',
            },
        });
    }
}
