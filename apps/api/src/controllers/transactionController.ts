import { Request, Response, NextFunction } from 'express';
import { calculateOrder } from '../services/calculationService.js';
import * as completeTransactionService from '../services/transactionService.js';
import { TransactionStatus } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { PAYPAY } from '../lib/paypay.js';

export const calculate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const { items, manualDiscountId } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Items array is required',
                },
            });
        }

        const result = await calculateOrder(orgId, items, manualDiscountId);

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        // Handle specific business logic errors
        if (error.message?.includes('別の組織') || error.message?.includes('Product not found')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CART_ITEMS',
                    message: error.message,
                },
            });
        }
        next(error);
    }
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const userId = req.user?.id;
        const { items, paymentMethod, manualDiscountId } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Items array is required and must not be empty',
                },
            });
        }

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Payment method is required',
                },
            });
        }

        // Serviceを使って取引作成 (ここで商品の有効性チェックも行われる)
        const transaction = await completeTransactionService.createTransaction({
            userId,
            organizationId: orgId,
            items: items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })),
            paymentMethod,
            manualDiscountId,
        });

        res.status(201).json({
            success: true,
            data: transaction,
        });
    } catch (error: any) {
        console.error('Transaction creation error:', error);

        if (error.message?.includes('別の組織') || error.message?.includes('Product not found')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CART_ITEMS',
                    message: error.message,
                },
            });
        }

        if (error.message?.startsWith('PRODUCT_NOT_AVAILABLE')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'PRODUCT_NOT_AVAILABLE',
                    message: error.message.replace('PRODUCT_NOT_AVAILABLE: ', ''),
                },
            });
        }

        next(error);
    }
};

/**
 * 現金決済完了
 * POST /api/v1/organizations/:orgId/transactions/:id/complete-cash
 * P2-021
 */
export const completeCashPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId, id: transactionId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }

        const completedTransaction = await completeTransactionService.completeTransaction(transactionId, userId, orgId);

        res.json({
            success: true,
            data: completedTransaction,
        });
    } catch (error: any) {
        console.error('Complete transaction error:', error);

        // ビジネスロジックエラーのハンドリング
        if (error.message === 'TRANSACTION_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: '取引が見つかりません',
                },
            });
        }

        if (error.message === 'ORGANIZATION_MISMATCH') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_MISMATCH',
                    message: 'この取引は別の組織に属しています',
                },
            });
        }

        if (error.message === 'USER_NOT_MEMBER') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'USER_NOT_MEMBER',
                    message: 'この組織のメンバーではありません',
                },
            });
        }

        if (error.message === 'TRANSACTION_NOT_PENDING') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_PENDING',
                    message: 'この取引は既に完了またはキャンセルされています',
                },
            });
        }

        if (error.message?.startsWith('INSUFFICIENT_STOCK')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: error.message.replace('INSUFFICIENT_STOCK: ', '在庫不足: '),
                },
            });
        }

        next(error);
    }
};

/**
 * PayPay決済開始
 * POST /api/v1/organizations/:orgId/transactions/:id/paypay/create
 * P3-004
 */
export const createPayPayPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId, id: transactionId } = req.params;

        // 取引を取得
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { organization: true }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: { code: 'TXN_NOT_FOUND', message: '取引が見つかりません' }
            });
        }

        if (transaction.organizationId !== orgId) {
            return res.status(403).json({
                success: false,
                error: { code: 'ORGANIZATION_MISMATCH', message: 'この取引は別の組織に属しています' }
            });
        }

        if (transaction.status !== TransactionStatus.PENDING) {
            return res.status(400).json({
                success: false,
                error: { code: 'TXN_NOT_PENDING', message: 'この取引は既に完了またはキャンセルされています' }
            });
        }

        // 既にPayPayオーダーIDがある場合（再試行時など）、念のため上書きするかそのまま使うか
        // ここでは新規にIDを生成して一意性を担保する
        const merchantPaymentId = `${transactionId.substring(0, 8)}-${Date.now()}`;

        const payload = {
            merchantPaymentId,
            amount: {
                amount: transaction.totalAmount,
                currency: 'JPY',
            },
            codeType: 'ORDER_QR',
            orderDescription: `${transaction.organization.name} でのお会計`,
            isAuthorization: false,
            // 決済完了時のコールバックURL（必要に応じて設定）
            // redirectionUrl: `${process.env.FRONTEND_URL}/pos/payment/paypay/callback`,
            // redirectionType: 'APP_DEEP_LINK',
        };

        const response = await (PAYPAY as any).QRCodeCreate(payload);

        if (response.BODY && response.BODY.resultInfo && response.BODY.resultInfo.code === 'SUCCESS') {
            // DBを更新
            await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    paypayOrderId: merchantPaymentId,
                    paypayCodeId: response.BODY.data.codeId // codeIdを保存
                }
            });

            res.json({
                success: true,
                data: {
                    qrCodeUrl: response.BODY.data.url,
                    deepLink: response.BODY.data.deeplink,
                    expiresAt: response.BODY.data.expiryDate,
                    merchantPaymentId
                }
            });
        } else {
            console.error('PayPay API error:', response.BODY?.resultInfo || response);
            res.status(500).json({
                success: false,
                error: {
                    code: 'PAYPAY_CREATE_FAILED',
                    message: 'PayPay QRコードの作成に失敗しました',
                    details: response.BODY?.resultInfo
                }
            });
        }
    } catch (error: any) {
        console.error('PayPay creation error:', error);
        next(error);
    }
};

/**
 * 取引キャンセル
 * POST /api/v1/organizations/:orgId/transactions/:id/cancel
 * P3-011
 */
export const cancelTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId, id: transactionId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }

        // ServiceのcancelTransactionは同名で衝突するため、import時にaliasをつけるか、
        // 上記でimportしているcompleteTransactionと同じ場所からimportされているものと仮定
        // ここではファイル上部のimportを修正する必要があるため、一旦関数名で呼ぶ
        const { cancelTransaction: cancelService } = await import('../services/transactionService.js');
        const canceledTransaction = await cancelService(transactionId, userId, orgId);

        res.json({
            success: true,
            data: canceledTransaction,
        });
    } catch (error: any) {
        console.error('Cancel transaction error:', error);

        if (error.message === 'TRANSACTION_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: '取引が見つかりません',
                },
            });
        }

        if (error.message === 'ORGANIZATION_MISMATCH') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_MISMATCH',
                    message: 'この取引は別の組織に属しています',
                },
            });
        }

        if (error.message === 'USER_NOT_MEMBER') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'USER_NOT_MEMBER',
                    message: 'この組織のメンバーではありません',
                },
            });
        }

        if (error.message === 'TRANSACTION_NOT_PENDING') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_PENDING',
                    message: 'この取引はキャンセルできません（完了済みまたは既にキャンセル済み）',
                },
            });
        }

        next(error);
    }
};

/**
 * PayPay決済状態確認
 * GET /api/v1/organizations/:orgId/transactions/:id/paypay/status
 * P3-016
 */
export const checkPayPayStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId, id: transactionId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
            });
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { organization: true }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: { code: 'TXN_NOT_FOUND', message: '取引が見つかりません' }
            });
        }

        if (transaction.organizationId !== orgId) {
            return res.status(403).json({
                success: false,
                error: { code: 'ORGANIZATION_MISMATCH', message: 'この取引は別の組織に属しています' }
            });
        }

        if (!transaction.paypayOrderId) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_PAYPAY_ORDER', message: 'PayPay Order IDがありません' }
            });
        }

        // Call PayPay API to get payment details using GetCodePaymentDetails (per official flow for Dynamic QR)
        // See: Dynamic QR Code Integration Flow -> GET /v2/codes/payments/{merchantPaymentId}
        // Note: SDK expects an array for merchantPaymentId
        const detailsResponse = await (PAYPAY as any).GetCodePaymentDetails([transaction.paypayOrderId]);

        let paypayStatus = 'UNKNOWN';
        if (detailsResponse.BODY && detailsResponse.BODY.resultInfo.code === 'SUCCESS') {
            paypayStatus = detailsResponse.BODY.data.status;

            // If the status is CREATED, it means QR is generated but not yet paid.
            // If API returns success but status is CREATED, we treat it as PENDING.
            if (paypayStatus === 'CREATED') {
                paypayStatus = 'PENDING';
            }
        } else {
            const code = detailsResponse.BODY?.resultInfo?.code;
            const message = detailsResponse.BODY?.resultInfo?.message;
            console.error('PayPay Status Check Failed:', detailsResponse.BODY || detailsResponse);

            // If "Dynamic QR payment not found" or "CREATED", it implies the payment hasn't been completed yet -> PENDING
            if (
                code === 'DYNAMIC_QR_PAYMENT_NOT_FOUND' ||
                message?.includes('not found')
            ) {
                paypayStatus = 'PENDING';
            }
        }

        console.log(`PayPay Status for ${transactionId}: ${paypayStatus}, Local Status: ${transaction.status}`);

        // If PayPay is COMPLETED but local is PENDING, synchronize.
        if (paypayStatus === 'COMPLETED' && transaction.status === TransactionStatus.PENDING) {
            console.log(`Synching transaction ${transactionId} to COMPLETED via status check.`);
            await completeTransactionService.completeTransaction(transactionId, transaction.userId, orgId); // Using transaction.userId as owner

            // Re-fetch to get updated data
            const updatedTx = await prisma.transaction.findUnique({
                where: { id: transactionId }
            });
            return res.json({
                success: true,
                data: {
                    status: updatedTx?.status,
                    paypayStatus,
                    synced: true
                }
            });
        }

        res.json({
            success: true,
            data: {
                status: transaction.status,
                paypayStatus,
                synced: false
            }
        });

    } catch (error: any) {
        console.error('Check PayPay status error:', error);
        next(error);
    }
};

/**
 * 取引一覧取得 (P4-028)
 * GET /api/v1/organizations/:orgId/transactions
 */
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        // EndDateをその日の終わりに設定
        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
        }

        const paymentMethod = req.query.paymentMethod as string;
        const status = req.query.status as TransactionStatus;

        // 検索条件の構築
        const where: any = {
            organizationId: orgId,
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        if (status) {
            where.status = status;
        }

        const [total, transactions] = await Promise.all([
            prisma.transaction.count({ where }),
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { name: true }
                    }
                }
            })
        ]);

        res.json({
            success: true,
            data: transactions,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 取引詳細取得 (P4-029)
 * GET /api/v1/organizations/:orgId/transactions/:id
 */
export const getTransactionDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId, id: transactionId } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: { select: { name: true } },
                        discount: true // Include applied discount details
                    }
                },
                discount: true // Global discount
            }
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'TRANSACTION_NOT_FOUND',
                    message: '取引が見つかりません'
                }
            });
        }

        if (transaction.organizationId !== orgId) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'この組織の取引ではありません' }
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        next(error);
    }
};
