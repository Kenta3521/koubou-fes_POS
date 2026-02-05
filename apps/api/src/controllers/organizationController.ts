import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * 団体一覧取得
 * GET /api/v1/organizations
 */
export async function listOrganizations(req: Request, res: Response): Promise<void> {
    try {
        // システム管理者以外は、自分の所属する団体のみ見れるべきか、あるいは公開団体リストか？
        // API仕様書4.1では詳細記述なし。
        // 一般的には自分の所属団体は users/me で取るので、ここは「公開されている団体一覧」あるいは「管理者用一覧」か。
        // ここでは全団体を返します（稼働中のもの）

        const organizations = await prisma.organization.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                inviteCode: true, // 公開してよいか微妙だが、仕様書にあるため
                isActive: true,
                createdAt: true,
            }
        });

        res.status(200).json({
            success: true,
            data: organizations,
        });
    } catch (error) {
        logger.error('List organizations error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '団体の取得に失敗しました',
            },
        });
    }
}

/**
 * 団体詳細取得
 * GET /api/v1/organizations/:orgId
 */
export async function getOrganization(req: Request, res: Response): Promise<void> {
    const { orgId } = req.params;
    try {
        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
        });

        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: '団体が見つかりません',
                },
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: organization,
        });
    } catch (error) {
        logger.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: '団体の取得に失敗しました',
            },
        });
    }
}
