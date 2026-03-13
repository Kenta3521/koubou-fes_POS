/**
 * Product Controller
 * Phase 4: P4-010 ~ P4-012 商品管理API
 * HTTPリクエストハンドラー
 */

import { Request, Response } from 'express';
import { getProductsByOrganization, getProduct as getProductService, createProduct as createProductService, updateProduct as updateProductService, deleteProduct as deleteProductService } from '../services/productService.js';
import { createLogger } from '../utils/logger.js';
import { createAuditLog } from '../services/auditService.js';

const logger = createLogger();

/**
 * 商品一覧取得
 * GET /api/v1/organizations/:orgId/products
 */
export async function listProducts(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { categoryId } = req.query;

        // 権限チェックは middleware で organizationId との整合性をチェック済みとするか、
        // ここで厳密に行うかはポリシー次第だが、organizationRoutesで authenticate しているので
        // userは特定できている。

        const products = await getProductsByOrganization(orgId, categoryId as string);

        res.json({
            success: true,
            data: products,
        });
    } catch (error) {
        logger.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '商品一覧の取得に失敗しました',
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

        const product = await getProductService(orgId, productId);

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

        res.json({
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

/**
 * 商品作成
 * POST /api/v1/organizations/:orgId/products
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { name, price, categoryId, stock, isActive } = req.body;

        // Validation
        if (!name || price === undefined) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '商品名と価格は必須です',
                },
            });
            return;
        }

        const product = await createProductService(orgId, {
            name,
            price: Number(price),
            categoryId,
            stock: stock !== undefined ? Number(stock) : undefined,
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        });

        // 監査ログ記録: 商品作成
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'PRODUCT_CREATE',
                category: 'PRODUCT',
                organizationId: orgId,
                targetId: product.id,
                payload: {
                    productId: product.id,
                    productName: name,
                    price: Number(price),
                    categoryId,
                    stock: stock !== undefined ? Number(stock) : undefined
                },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error: any) {
        logger.error('Error creating product:', error);
        if (error.message === 'CATEGORY_NOT_FOUND') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'CATEGORY_NOT_FOUND',
                    message: '指定されたカテゴリが存在しません',
                },
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '商品の作成に失敗しました',
            },
        });
    }
}

/**
 * 商品更新
 * PATCH /api/v1/organizations/:orgId/products/:productId
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, productId } = req.params;
        const { name, price, categoryId, stock, isActive } = req.body;

        const product = await updateProductService(orgId, productId, {
            name,
            price: price !== undefined ? Number(price) : undefined,
            categoryId,
            stock: stock !== undefined ? Number(stock) : undefined,
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        });

        // 監査ログ記録: 商品更新
        try {
            const changes: any = {};
            if (name !== undefined) changes.name = name;
            if (price !== undefined) changes.price = Number(price);
            if (categoryId !== undefined) changes.categoryId = categoryId;
            if (stock !== undefined) changes.stock = Number(stock);
            if (isActive !== undefined) changes.isActive = Boolean(isActive);

            await createAuditLog({
                userId: req.user!.id,
                action: 'PRODUCT_UPDATE',
                category: 'PRODUCT',
                organizationId: orgId,
                targetId: productId,
                payload: {
                    productId,
                    productName: product.name,
                    changes
                },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.json({
            success: true,
            data: product,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: '商品が見つかりません',
                },
            });
            return;
        }
        if (error.message === 'CATEGORY_NOT_FOUND') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'CATEGORY_NOT_FOUND',
                    message: '指定されたカテゴリが存在しません',
                },
            });
            return;
        }
        logger.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '商品の更新に失敗しました',
            },
        });
    }
}

/**
 * 商品削除 (論理削除)
 * DELETE /api/v1/organizations/:orgId/products/:productId
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, productId } = req.params;

        // 削除前に商品情報を取得
        const product = await getProductService(orgId, productId);

        await deleteProductService(orgId, productId);

        // 監査ログ記録: 商品削除
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'PRODUCT_DELETE',
                category: 'PRODUCT',
                organizationId: orgId,
                targetId: productId,
                payload: {
                    productId,
                    productName: product?.name
                },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_FOUND',
                    message: '商品が見つかりません',
                },
            });
            return;
        }
        logger.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '商品の削除に失敗しました',
            },
        });
    }
}
