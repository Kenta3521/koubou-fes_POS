import { Request, Response, NextFunction } from 'express';
import { calculateOrder } from '../services/calculationService.js';
import { completeTransaction } from '../services/transactionService.js';
import { TransactionStatus } from '@prisma/client';
import prisma from '../utils/prisma.js';

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

        // Calculate the order to get accurate totals
        const calculation = await calculateOrder(orgId, items, manualDiscountId);

        // Create transaction with items
        const transaction = await prisma.transaction.create({
            data: {
                organizationId: orgId,
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

        const completedTransaction = await completeTransaction(transactionId, userId, orgId);

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

