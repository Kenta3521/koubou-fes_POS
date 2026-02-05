import prisma from '../utils/prisma.js';

export const findAll = async (organizationId: string) => {
    return prisma.discount.findMany({
        where: {
            organizationId,
            isActive: true, // デフォルトで有効なものだけ取得するか？
            // UI側で無効なものも含めて管理画面で表示する場合があるが、
            // POS画面用(P2-010)としては本来「有効なもの」が欲しい。
            // しかしAPI設計書 7.1 ではフィルタパラメータがない。
            // 管理画面用(Admin)とPOS用で分けるべきだが、汎用一覧としては全て返し、クライアントでフィルタが一般的。
            // ここでは全て返します。
        },
        orderBy: [
            { priority: 'desc' }, // 優先度高い順
            { type: 'asc' } // 同優先度ならタイプ順（適当）
        ],
        include: {
            product: true, // 対象商品名などを表示するために商品情報も含める
        }
    });
};
