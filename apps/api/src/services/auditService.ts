import prisma from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

/**
 * 監査ログを記録する
 * @param params 記録するログの内容
 */
export async function createLog(params: {
    userId: string;
    action: string;
    payload?: Prisma.InputJsonValue;
    organizationId?: string;
    targetId?: string;
}) {
    const { userId, action, payload, organizationId, targetId } = params;

    try {
        // 操作ユーザーがシステム管理者かどうかを確認
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isSystemAdmin: true }
        });

        const isSystemAdminAction = user?.isSystemAdmin || false;

        // ログ。エラーが発生してもメインの処理を止めないよう、例外はキャッチするが、
        // 基本的には非同期で実行される
        return await prisma.auditLog.create({
            data: {
                userId,
                action,
                payload: payload ?? {},
                organizationId,
                targetId,
                isSystemAdminAction
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // 監査ログの失敗で業務を止めない
    }
}

/**
 * 団体の監査ログを取得する (団体管理者用)
 */
export async function getOrganizationLogs(organizationId: string, options: {
    from?: string;
    to?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
}) {
    const { from, to, userId, action, limit = 20, offset = 0 } = options;

    const where: Prisma.AuditLogWhereInput = { organizationId };

    if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as any).gte = new Date(from);
        if (to) (where.createdAt as any).lte = new Date(to);
    }

    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.auditLog.count({ where })
    ]);

    return { logs, total };
}

/**
 * 全体の監査ログを取得する (システム管理者用)
 */
export async function getAllLogs(options: {
    organizationId?: string;
    userId?: string;
    action?: string;
    isSystemAdminAction?: boolean;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}) {
    const { organizationId, userId, action, isSystemAdminAction, from, to, limit = 20, offset = 0 } = options;

    const where: Prisma.AuditLogWhereInput = {};

    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (isSystemAdminAction !== undefined) where.isSystemAdminAction = isSystemAdminAction;

    if (from || to) {
        where.createdAt = {};
        if (from) (where.createdAt as any).gte = new Date(from);
        if (to) (where.createdAt as any).lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.auditLog.count({ where })
    ]);

    return { logs, total };
}
