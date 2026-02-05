/**
 * Category Service
 * Phase 2: P2-001 カテゴリ一覧API
 * ビジネスロジック層
 */

import prisma from '../utils/prisma.js';

/**
 * 団体のカテゴリ一覧を取得
 * @param organizationId 団体ID
 * @returns カテゴリ一覧（sortOrder順）
 */
export async function getCategoriesByOrganization(organizationId: string) {
    const categories = await prisma.category.findMany({
        where: {
            organizationId,
        },
        select: {
            id: true,
            organizationId: true,
            name: true,
            sortOrder: true,
            _count: {
                select: {
                    products: true,
                },
            },
        },
        orderBy: {
            sortOrder: 'asc',
        },
    });

    return categories;

}

/**
 * カテゴリ作成
 * @param organizationId 団体ID
 * @param name カテゴリ名
 * @param sortOrder 表示順
 */
export async function createCategory(
    organizationId: string,
    name: string,
    sortOrder: number = 0
) {
    const category = await prisma.category.create({
        data: {
            organizationId,
            name,
            sortOrder,
        },
    });

    return category;
}

/**
 * カテゴリ更新
 * @param organizationId 団体ID
 * @param categoryId カテゴリID
 * @param data 更新データ
 */
export async function updateCategory(
    organizationId: string,
    categoryId: string,
    data: { name?: string; sortOrder?: number }
) {
    const category = await prisma.category.update({
        where: {
            id: categoryId,
            organizationId,
        },
        data,
    });


    return category;
}

/**
 * カテゴリ削除
 * @param organizationId 団体ID
 * @param categoryId カテゴリID
 * @throws Error CATEGORY_HAS_PRODUCTS if products exist
 */
export async function deleteCategory(organizationId: string, categoryId: string) {
    // 1. 紐づく商品の存在確認
    const productCount = await prisma.product.count({
        where: {
            categoryId,
            organizationId, // 安全のため団体IDも含める
        },
    });

    if (productCount > 0) {
        throw new Error('CATEGORY_HAS_PRODUCTS');
    }

    // 2. カテゴリ削除

    await prisma.category.delete({
        where: {
            id: categoryId,
            organizationId,
        },
    });
}

/**
 * カテゴリ並び替え
 * @param organizationId 団体ID
 * @param categoryIds 並び替え後のカテゴリID配列
 */
export async function reorderCategories(organizationId: string, categoryIds: string[]) {
    // Transaction for bulk updates
    await prisma.$transaction(
        categoryIds.map((id, index) =>
            prisma.category.update({
                where: { id, organizationId },
                data: { sortOrder: index },
            })
        )
    );
}

