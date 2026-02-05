import prisma from '../utils/prisma.js';
import { TransactionStatus, StockChangeReason } from '@prisma/client';

/**
 * 取引を完了し、在庫を減算してStockLogを記録する
 * P2-021, P2-022, P2-023
 */
export const completeTransaction = async (
    transactionId: string,
    userId: string,
    organizationId: string
) => {
    // Prismaトランザクションで一貫性を保証
    return await prisma.$transaction(async (tx) => {
        // 1. 取引を取得
        const transaction = await tx.transaction.findUnique({
            where: { id: transactionId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!transaction) {
            throw new Error('TRANSACTION_NOT_FOUND');
        }

        // 2. 組織チェック: 取引が指定された組織に属しているか
        if (transaction.organizationId !== organizationId) {
            throw new Error('ORGANIZATION_MISMATCH');
        }

        // 3. ユーザーの組織所属チェック
        const membership = await tx.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
        });

        if (!membership) {
            throw new Error('USER_NOT_MEMBER');
        }

        // 4. ステータスチェック
        if (transaction.status !== TransactionStatus.PENDING) {
            throw new Error('TRANSACTION_NOT_PENDING');
        }

        // 5. 在庫減算とStockLog記録
        for (const item of transaction.items) {
            // 在庫チェック
            if (item.product.stock < item.quantity) {
                throw new Error(`INSUFFICIENT_STOCK: ${item.product.name}`);
            }

            // 在庫減算
            await tx.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        decrement: item.quantity,
                    },
                },
            });

            // StockLog記録
            await tx.stockLog.create({
                data: {
                    productId: item.productId,
                    changeAmount: -item.quantity,
                    reason: StockChangeReason.SALE,
                },
            });
        }

        // 6. 取引ステータスを完了に更新
        const completedTransaction = await tx.transaction.update({
            where: { id: transactionId },
            data: {
                status: TransactionStatus.COMPLETED,
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                discount: true,
            },
        });

        return completedTransaction;
    });
};
