/**
 * Category Controller
 * Phase 2: P2-001 カテゴリ一覧API
 * HTTPリクエストハンドラー
 */

import { Request, Response } from 'express';
import { getCategoriesByOrganization, createCategory as createCategoryService, updateCategory as updateCategoryService, deleteCategory as deleteCategoryService, reorderCategories as reorderCategoriesService } from '../services/categoryService.js';
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

/**
 * カテゴリ作成
 * POST /api/v1/organizations/:orgId/categories
 */
export async function createCategory(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { name, sortOrder } = req.body;

        // 1. パラメータ検証
        if (!orgId || !name) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '団体IDとカテゴリ名は必須です',
                },
            });
            return;
        }

        // 2. 権限チェック (Middlewareでチェック済みのため、ここではOrg所属チェックのみ)
        const userOrgs = req.user?.organizations || [];
        const userOrg = userOrgs.find((org) => org.id === orgId);

        // System Adminは所属していなくてもアクセス可能(permission middlewareで担保されているが念のため)
        // ただし、permission middlewareが通っていればOKとするなら、ここの所属チェックも不要かもしれないが
        // 念のため所属しているか、システム管理者であるかは確認してもよい。
        // RBAC的には permission middleware ('create', 'category') が通っていればOK。
        // ここでは冗長なADMINロールチェックを削除する。


        // 3. カテゴリ作成
        const newCategory = await createCategoryService(orgId, name, sortOrder);

        // 4. レスポンス
        res.status(201).json({
            success: true,
            data: newCategory,
        });

    } catch (error) {
        logger.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'カテゴリの作成に失敗しました',
            },
        });
    }
}

/**
 * カテゴリ更新
 * PATCH /api/v1/organizations/:orgId/categories/:categoryId
 */
export async function updateCategory(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, categoryId } = req.params;
        const { name, sortOrder } = req.body;

        // 1. パラメータ検証
        if (!orgId || !categoryId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '団体IDとカテゴリIDは必須です',
                },
            });
            return;
        }

        if (name === undefined && sortOrder === undefined) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '更新するデータ（名前または表示順）が必要です',
                },
            });
            return;
        }

        // 2. 権限チェック (Middlewareでチェック済み)


        // 3. カテゴリ更新
        const updatedCategory = await updateCategoryService(orgId, categoryId, { name, sortOrder });

        // 4. レスポンス
        res.status(200).json({
            success: true,
            data: updatedCategory,
        });

    } catch (error: any) {
        if (error.code === 'P2025') { // Prisma Record Not Found
            res.status(404).json({
                success: false,
                error: {
                    code: 'CATEGORY_NOT_FOUND',
                    message: 'カテゴリが見つかりません',
                },
            });
            return;
        }
        logger.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'カテゴリの更新に失敗しました',
            },
        });
    }
}

/**
 * カテゴリ削除
 * DELETE /api/v1/organizations/:orgId/categories/:categoryId
 */
export async function deleteCategory(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, categoryId } = req.params;

        // 1. パラメータ検証
        if (!orgId || !categoryId) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '団体IDとカテゴリIDは必須です',
                },
            });
            return;
        }

        // 2. 権限チェック (Middlewareでチェック済み)


        // 3. カテゴリ削除
        await deleteCategoryService(orgId, categoryId);

        // 4. レスポンス
        res.status(204).send();

    } catch (error: any) {
        if (error.message === 'CATEGORY_HAS_PRODUCTS') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'CATEGORY_HAS_PRODUCTS',
                    message: 'このカテゴリには商品が紐づいているため削除できません。先に商品を移動または削除してください。',
                },
            });
            return;
        }

        if (error.code === 'P2025') { // Prisma Record Not Found
            res.status(404).json({
                success: false,
                error: {
                    code: 'CATEGORY_NOT_FOUND',
                    message: 'カテゴリが見つかりません',
                },
            });
            return;
        }

        logger.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'カテゴリの削除に失敗しました',
            },
        });
    }
}


/**
 * カテゴリ並び替え
 * PATCH /api/v1/organizations/:orgId/categories/reorder
 */
export async function reorderCategories(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { categoryIds } = req.body;

        if (!Array.isArray(categoryIds)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'categoryIds must be an array',
                },
            });
            return;
        }

        // 権限チェック (Middlewareでチェック済み)


        await reorderCategoriesService(orgId, categoryIds);

        res.json({
            success: true,
            data: { message: 'Categories reordered successfully' },
        });
    } catch (error) {
        logger.error('Reorder categories error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error',
            },
        });
    }
}

