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
        },
        orderBy: {
            sortOrder: 'asc',
        },
    });

    return categories;
}
