/**
 * Stripe Terminal コントローラー
 * iOS-3-003 connection-token
 * iOS-3-004 create-payment-intent
 * iOS-3-005 cancel-payment-intent
 */

import { Request, Response, NextFunction } from 'express';
import stripe from '../lib/stripe.js';
import prisma from '../utils/prisma.js';

/**
 * Stripe Terminal 接続トークン発行
 * POST /api/v1/stripe/connection-token
 *
 * iOS Stripe Terminal SDK の初期化に使用する。
 * SystemSetting.stripeLocationId が設定されている場合はそのロケーションにスコープする。
 */
export const createConnectionToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await prisma.systemSetting.findUnique({ where: { id: 'singleton' } });
        const locationId = settings?.stripeLocationId ?? undefined;

        const connectionToken = await stripe.terminal.connectionTokens.create(
            locationId ? { location: locationId } : {}
        );

        res.json({ success: true, data: { secret: connectionToken.secret } });
    } catch (error) {
        next(error);
    }
};

/**
 * Stripe PaymentIntent 作成（Tap to Pay 用）
 * POST /api/v1/stripe/create-payment-intent
 * Body: { orgId: string, transactionId: string }
 *
 * - 取引を DB から取得して金額を確認する
 * - PaymentIntent を作成して stripePaymentIntentId を Transaction に保存する
 * - iOS SDK に clientSecret と paymentIntentId を返す
 */
export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId, transactionId } = req.body as { orgId: string; transactionId: string };
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
            });
        }

        if (!orgId || !transactionId) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_PARAMS', message: 'orgId と transactionId は必須です' },
            });
        }

        // enable_tap_to_pay 権限チェック（system admin は常に許可）
        if (!req.user?.isSystemAdmin) {
            const membership = req.user?.organizations.find(o => o.id === orgId);
            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'PERMISSION_DENIED', message: 'この組織に所属していません' },
                });
            }
            const permissions = membership.permissions ?? [];
            if (!permissions.includes('enable_tap_to_pay')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'PERMISSION_DENIED',
                        message: 'タップ決済の権限がありません。管理者に付与を依頼してください',
                    },
                });
            }
        }

        // 取引取得
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: { code: 'TRANSACTION_NOT_FOUND', message: '取引が見つかりません' },
            });
        }

        if (transaction.organizationId !== orgId) {
            return res.status(403).json({
                success: false,
                error: { code: 'ORGANIZATION_MISMATCH', message: 'この取引は別の組織に属しています' },
            });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: { code: 'TRANSACTION_NOT_PENDING', message: 'この取引は既に完了またはキャンセルされています' },
            });
        }

        // 既に PaymentIntent が紐付いている場合は再利用
        if (transaction.stripePaymentIntentId) {
            const existing = await stripe.paymentIntents.retrieve(transaction.stripePaymentIntentId);
            if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation') {
                return res.json({
                    success: true,
                    data: {
                        clientSecret: existing.client_secret,
                        paymentIntentId: existing.id,
                    },
                });
            }
        }

        // PaymentIntent 作成（JPY はゼロ小数通貨なので金額をそのまま渡す）
        const paymentIntent = await stripe.paymentIntents.create({
            amount: transaction.totalAmount,
            currency: 'jpy',
            payment_method_types: ['card_present'],
            capture_method: 'automatic',
        });

        // Transaction に paymentIntentId を保存
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { stripePaymentIntentId: paymentIntent.id },
        });

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Stripe PaymentIntent キャンセル
 * POST /api/v1/stripe/cancel-payment-intent
 * Body: { paymentIntentId: string }
 *
 * ユーザーが決済をキャンセルした際に呼ぶ。
 * Transaction 側のキャンセルは /transactions/:id/cancel で別途行う。
 */
export const cancelPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { paymentIntentId } = req.body as { paymentIntentId: string };

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_PARAMS', message: 'paymentIntentId は必須です' },
            });
        }

        const cancelled = await stripe.paymentIntents.cancel(paymentIntentId);

        res.json({ success: true, data: { status: cancelled.status } });
    } catch (error: any) {
        // 既にキャンセル済みや完了済みの場合は無視してOK
        if (error?.type === 'StripeInvalidRequestError') {
            return res.json({
                success: true,
                data: { status: 'already_finalized', message: error.message },
            });
        }
        next(error);
    }
};
