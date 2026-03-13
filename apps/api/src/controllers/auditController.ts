import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import { createLogger } from '../utils/logger.js';
import { AuditCategory } from '../services/auditService.js';

const logger = createLogger();

/**
 * 監査ログ取得 (団体管理者用)
 * GET /api/v1/organizations/:orgId/audit-logs
 */
export async function getOrgAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
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

        const category = req.query.category as AuditCategory;
        const userId = req.query.userId as string;

        // 検索条件
        const where: any = {
            organizationId: orgId,
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        if (category) {
            where.category = category;
        }

        if (userId) {
            where.userId = userId;
        }

        const [total, logs] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            })
        ]);

        res.json({
            success: true,
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        logger.error('Get org audit logs error:', error);
        next(error);
    }
}

/**
 * 監査ログ CSVエクスポート (団体管理者用)
 * GET /api/v1/organizations/:orgId/audit-logs/export
 */
export async function exportOrgAuditLogsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { orgId } = req.params;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const category = req.query.category as AuditCategory;
        const userId = req.query.userId as string;

        const where: any = { organizationId: orgId };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }
        if (category) where.category = category;
        if (userId) where.userId = userId;

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } }
            }
        });

        // CSV生成
        const header = ['ID', '日時', 'カテゴリ', '操作', '実行者', '実行者Email', '対象ID', '詳細(JSON)'];
        const rows = logs.map(log => [
            log.id,
            log.createdAt.toISOString(),
            log.category || '',
            log.action,
            log.user.name,
            log.user.email,
            log.targetId || '',
            JSON.stringify(log.payload || {}).replace(/"/g, '""') // JSON内の二重引用符をエスケープ
        ]);

        const csvContent = [
            header.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // BOM付与 (Excel文字化け対策)
        const bom = '\uFEFF';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${orgId}_${Date.now()}.csv"`);
        res.send(bom + csvContent);

    } catch (error) {
        logger.error('Export org audit logs error:', error);
        next(error);
    }
}

/**
 * 監査ログ取得 (システム管理者用)
 * GET /api/v1/admin/audit-logs
 */
export async function getSystemAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // システム管理者は全団体のログが見れる
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const category = req.query.category as AuditCategory;
        const userId = req.query.userId as string;
        const organizationId = req.query.organizationId as string;

        const where: any = {};

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }
        if (category) where.category = category;
        if (userId) where.userId = userId;
        if (organizationId) where.organizationId = organizationId;

        const [total, logs] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    organization: { select: { name: true } }
                }
            })
        ]);

        res.json({
            success: true,
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        logger.error('Get system audit logs error:', error);
        next(error);
    }
}

/**
 * 監査ログ CSVエクスポート (システム管理者用)
 * GET /api/v1/admin/audit-logs/export
 */
export async function exportSystemAuditLogsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const category = req.query.category as AuditCategory;
        const userId = req.query.userId as string;
        const organizationId = req.query.organizationId as string;

        const where: any = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }
        if (category) where.category = category;
        if (userId) where.userId = userId;
        if (organizationId) where.organizationId = organizationId;

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                organization: { select: { name: true } }
            }
        });

        // CSV生成
        const header = ['ID', '日時', 'カテゴリ', '操作', '実行者', '実行者Email', '団体', '対象ID', '詳細(JSON)'];
        const rows = logs.map(log => [
            log.id,
            log.createdAt.toISOString(),
            log.category || '',
            log.action,
            log.user.name,
            log.user.email,
            log.organization?.name || 'システム全体',
            log.targetId || '',
            JSON.stringify(log.payload || {}).replace(/"/g, '""')
        ]);

        const csvContent = [
            header.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const bom = '\uFEFF';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="system_audit_logs_${Date.now()}.csv"`);
        res.send(bom + csvContent);

    } catch (error) {
        logger.error('Export system audit logs error:', error);
        next(error);
    }
}
