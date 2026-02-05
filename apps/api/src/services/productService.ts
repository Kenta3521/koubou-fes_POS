/**
 * Product Service
 * Phase 4: P4-010 ~ P4-012 商品管理API
 * ビジネスロジック層
 */

import prisma from '../utils/prisma.js';

/**
 * 団体の商品一覧を取得（論理削除済みを除く）
 * @param organizationId 団体ID
 * @param categoryId カテゴリID（任意）
 * @returns 商品一覧
 */
export async function getProductsByOrganization(organizationId: string, categoryId?: string) {
    const where: any = {
        organizationId,
        deletedAt: null, // 論理削除されていないもの
    };

    if (categoryId) {
        where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
        where,
        orderBy: {
            name: 'asc', // デフォルトは名前順、必要に応じて sortOrder 追加
        },
        include: {
            category: { // カテゴリ名も返す
                select: {
                    id: true,
                    name: true,
                }
            }
        }
    });

    return products;
}

/**
 * 商品詳細取得
 * @param organizationId 団体ID
 * @param productId 商品ID
 */
export async function getProduct(organizationId: string, productId: string) {
    const product = await prisma.product.findFirst({
        where: {
            id: productId,
            organizationId,
            deletedAt: null,
        },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                }
            }
        }
    });
    return product;
}

/**
 * 商品作成
 * @param organizationId 団体ID
 * @param data 商品データ
 */
export async function createProduct(
    organizationId: string,
    data: { name: string; price: number; categoryId?: string; stock?: number; isActive?: boolean }
) {
    // カテゴリIDの検証（存在確認）
    if (data.categoryId) {
        const category = await prisma.category.findFirst({
            where: { id: data.categoryId, organizationId }
        });
        if (!category) {
            throw new Error('CATEGORY_NOT_FOUND');
        }
    }

    const product = await prisma.product.create({
        data: {
            organizationId,
            name: data.name,
            price: data.price,
            categoryId: data.categoryId,
            stock: data.stock ?? 0,
            isActive: data.isActive ?? true,
        },
    });

    return product;
}

/**
 * 商品更新
 * @param organizationId 団体ID
 * @param productId 商品ID
 * @param data 更新データ
 */
export async function updateProduct(
    organizationId: string,
    productId: string,
    data: { name?: string; price?: number; categoryId?: string; stock?: number; isActive?: boolean }
) {
    // カテゴリIDの検証
    if (data.categoryId) {
        const category = await prisma.category.findFirst({
            where: { id: data.categoryId, organizationId }
        });
        if (!category) {
            throw new Error('CATEGORY_NOT_FOUND');
        }
    }

    const product = await prisma.product.update({
        where: {
            id: productId,
            organizationId,
            deletedAt: null,
        },
        data,
    });

    return product;
}

/**
 * 商品削除（論理削除）
 * @param organizationId 団体ID
 * @param productId 商品ID
 */
export async function deleteProduct(organizationId: string, productId: string) {
    // already deleted check is implicit by where clause (will throw P2025 if not found)
    await prisma.product.update({
        where: {
            id: productId,
            organizationId,
            deletedAt: null,
        },
        data: {
            deletedAt: new Date(),
        },
    });
}
