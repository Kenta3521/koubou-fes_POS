import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export type AuditAction =
    // Auth
    | 'USER_REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'USER_PROFILE_UPDATE' | 'PASSWORD_CHANGE'
    | 'MEMBER_JOIN' | 'MEMBER_ADD' | 'MEMBER_UPDATE' | 'MEMBER_REMOVE' | 'MEMBER_LEAVE'
    // Product/Category
    | 'CATEGORY_CREATE' | 'CATEGORY_UPDATE' | 'CATEGORY_DELETE' | 'CATEGORY_REORDER'
    | 'PRODUCT_CREATE' | 'PRODUCT_UPDATE' | 'PRODUCT_DELETE'
    // Discount
    | 'DISCOUNT_CREATE' | 'DISCOUNT_UPDATE' | 'DISCOUNT_DELETE'
    // Role
    | 'ROLE_CREATE' | 'ROLE_UPDATE' | 'ROLE_DELETE' | 'ROLE_PERM_UPDATE'
    // Transaction
    | 'TRANSACTION_CANCEL' | 'TRANSACTION_REFUND' | 'CASH_REPORT_CREATE'
    // Org/System
    | 'ORG_CREATE' | 'ORG_UPDATE' | 'ORG_INVITE_REGEN';

export type AuditCategory = 'AUTH' | 'USER' | 'PRODUCT' | 'DISCOUNT' | 'ROLE' | 'TRANSACTION' | 'ORG' | 'SYSTEM';

interface CreateAuditLogParams {
    userId: string;
    action: AuditAction;
    category: AuditCategory;
    organizationId?: string;
    targetId?: string;
    payload?: any;
    isSystemAdminAction?: boolean;
}

/**
 * 監査ログを作成する
 * @param params ログ詳細
 * @param tx トランザクションクライアント (オプション)
 */
export async function createAuditLog(
    params: CreateAuditLogParams,
    tx?: Prisma.TransactionClient
): Promise<void> {
    const db = tx || prisma;
    const { userId, action, category, organizationId, targetId, payload, isSystemAdminAction } = params;

    try {
        await db.auditLog.create({
            data: {
                userId,
                action,
                category,
                organizationId,
                targetId,
                payload: payload || {},
                isSystemAdminAction: isSystemAdminAction || false,
            },
        });
    } catch (error) {
        // 監査ログの失敗はクリティカルだが、メイン処理を止めるかどうかは呼び出し元のトランザクション次第。
        // ここではエラーを再スローして、トランザクション内ならロールバックさせる。
        logger.error('Failed to create audit log:', error);
        throw error;
    }
}
