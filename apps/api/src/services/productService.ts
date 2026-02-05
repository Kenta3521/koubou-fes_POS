/**
 * Product Service
 * Phase 2: P2-002 商品一覧API
 * ビジネスロジック層
 */

import prisma from '../utils/prisma.js';

export interface ProductFilters {
    categoryId?: string;
    isActive?: boolean;
}

/**
 * 団体の商品一覧を取得
 * @param organizationId 団体ID
 * @param filters フィルター条件（categoryId, isActive）
 * @returns 商品一覧
 */
export async function getProductsByOrganization(
    organizationId: string,
    filters: ProductFilters = {}
) {
    const { categoryId, isActive } = filters;

    // where条件の構築
    interface WhereClause {
        organizationId: string;
        categoryId?: string;
        isActive?: boolean;
    }

    const where: WhereClause = {
        organizationId,
    };

    // カテゴリIDでフィルタ
    if (categoryId !== undefined) {
        where.categoryId = categoryId;
    }

    // 有効/無効でフィルタ
    if (isActive !== undefined) {
        where.isActive = isActive;
    }


    const products = await prisma.product.findMany({
        where,
        select: {
            id: true,
            organizationId: true,
            categoryId: true,
            name: true,
            price: true,
            stock: true,
            isActive: true,
        },
        orderBy: [
            { categoryId: 'asc' },
            { name: 'asc' },
        ],
    });

    return products;
}

/**
 * 商品詳細を取得
 * @param organizationId 団体ID
 * @param productId 商品ID
 * @returns 商品詳細（見つからない場合はnull）
 */
export async function getProductById(organizationId: string, productId: string) {
    const product = await prisma.product.findFirst({
        where: {
            id: productId,
            organizationId, // 団体IDでフィルタ（他団体の商品は取得できない）
        },
        select: {
            id: true,
            organizationId: true,
            categoryId: true,
            name: true,
            price: true,
            stock: true,
            isActive: true,
        },
    });

    return product;
}
