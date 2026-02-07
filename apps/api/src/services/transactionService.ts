import prisma from '../utils/prisma.js';
import pkg from '@prisma/client';
const { TransactionStatus, StockChangeReason } = pkg;
import type { PaymentMethod } from '@prisma/client';
import { calculateOrder } from './calculationService.js';

interface CreateTransactionParams {
    userId: string;
    organizationId: string;
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    manualDiscountId?: string;
}

/**
 * 取引を作成する
 * P4-017: 販売停止中の商品の購入を防ぐ
 */
export const createTransaction = async ({
    userId,
    organizationId,
    items,
    paymentMethod,
    manualDiscountId,
}: CreateTransactionParams) => {
    // 1. 商品のステータスチェック (P4-017)
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: {
            id: { in: productIds },
            organizationId,
        },
    });

    // 商品が存在するか、削除されていないか、アクティブであるかを確認
    for (const item of items) {
        const product = products.find(p => p.id === item.productId);

        if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.deletedAt) {
            throw new Error(`PRODUCT_NOT_AVAILABLE: ${product.name} (Deleted)`);
        }

        if (!product.isActive) {
            throw new Error(`PRODUCT_NOT_AVAILABLE: ${product.name} (Inactive)`);
        }
    }

    // 2. 金額計算 (CalculationServiceを再利用)
    const calculation = await calculateOrder(organizationId, items, manualDiscountId);

    // 3. 取引作成
    const transaction = await prisma.transaction.create({
        data: {
            organizationId,
            userId,
            paymentMethod,
            totalAmount: calculation.totalAmount,
            discountAmount: calculation.totalDiscountAmount,
            discountId: manualDiscountId || null,
            status: TransactionStatus.PENDING,
            items: {
                create: calculation.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    originalPrice: item.originalPrice,
                    discountAmount: item.discountAmount,
                    appliedDiscountId: item.appliedDiscount?.id || null,
                })),
            },
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

    return transaction;
};

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

        // 3. ユーザーの組織所属チェック (SystemAdminはスキップ)
        const user = await tx.user.findUnique({ where: { id: userId } });
        const isSystemAdmin = user?.isSystemAdmin || false;

        if (!isSystemAdmin) {
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

            // 在庫チェック (P4-017: 念のためここでもチェックするが、createTransactionで弾くのが基本)
            // ただし、取引作成後に無効化されるケースも考慮してここで弾くのもありだが、
            // 「既に取引が作られているなら決済は通す」という考えもあれば、「決済直前で弾く」という考えもある。
            // 今回の要件「カートに入れてしまうとその後に販売休止しても購入できてしまう」を防ぐには
            // createTransaction時点でのチェックが必須。
            // completeTransaction時点でもチェックするとより安全。
            if (!item.product.isActive || item.product.deletedAt) {
                throw new Error(`PRODUCT_NOT_AVAILABLE: ${item.product.name}`);
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

/**
 * 取引をキャンセルする
 * P3-011
 * PayPay決済のQRコードがある場合は削除する
 */
export const cancelTransaction = async (
    transactionId: string,
    userId: string,
    organizationId: string
) => {
    // 1. 取引を取得
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
    });

    if (!transaction) {
        throw new Error('TRANSACTION_NOT_FOUND');
    }

    // 2. 組織チェック
    if (transaction.organizationId !== organizationId) {
        throw new Error('ORGANIZATION_MISMATCH');
    }

    // 3. ユーザーの組織所属チェック (SystemAdminはスキップ)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isSystemAdmin = user?.isSystemAdmin || false;

    if (!isSystemAdmin) {
        const membership = await prisma.userOrganization.findUnique({
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
    }

    // 4. ステータスチェック
    if (transaction.status !== TransactionStatus.PENDING) {
        // 既にキャンセル済みの場合は成功として扱う（冪等性）
        if (transaction.status === TransactionStatus.CANCELLED) {
            return transaction;
        }
        throw new Error('TRANSACTION_NOT_PENDING');
    }

    // 5. PayPayコードがある場合は削除
    if (transaction.paypayCodeId) {
        try {
            // ここで循環参照を避けるために動的インポートまたは注入をするのが理想だが、
            // 簡易的にlibから直接インポートする形をとる（Service -> Lib はOK）
            const { PAYPAY } = await import('../lib/paypay.js');
            await (PAYPAY as any).QRCodeDelete({
                codeId: transaction.paypayCodeId,
            });
            console.log(`PayPay QR code ${transaction.paypayCodeId} deleted.`);
        } catch (error) {
            console.error('Failed to delete PayPay QR code:', error);
            // PayPay側の削除失敗を理由にキャンセル自体を失敗させるかどうかは要件次第だが、
            // ここではログ出力に留めてDB側のキャンセルは続行する（整合性優先）
        }
    }

    // 6. ステータスをキャンセルに更新
    const canceledTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
            status: TransactionStatus.CANCELLED,
        },
        include: {
            items: true,
            discount: true,
        },
    });

    return canceledTransaction;
};
