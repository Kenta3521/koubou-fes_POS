import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/auditService.js';

/**
 * 団体管理者向けの監査ログ取得
 */
export const getOrganizationAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const { from, to, userId, action, limit, offset } = req.query;

        const result = await auditService.getOrganizationLogs(orgId, {
            from: from as string,
            to: to as string,
            userId: userId as string,
            action: action as string,
            limit: limit ? parseInt(limit as string) : 20,
            offset: offset ? parseInt(offset as string) : 0,
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * システム管理者向けの全体監査ログ取得
 */
export const getAllAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId, userId, action, isSystemAdminAction, from, to, limit, offset } = req.query;

        const result = await auditService.getAllLogs({
            organizationId: organizationId as string,
            userId: userId as string,
            action: action as string,
            isSystemAdminAction: isSystemAdminAction === 'true' ? true : (isSystemAdminAction === 'false' ? false : undefined),
            from: from as string,
            to: to as string,
            limit: limit ? parseInt(limit as string) : 20,
            offset: offset ? parseInt(offset as string) : 0,
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
