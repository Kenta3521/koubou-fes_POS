import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { createLogger } from '../utils/logger.js';
import { createAuditLog } from '../services/auditService.js';

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

/**
 * 団体作成 (SYSTEM_ADMIN)
 * POST /api/v1/organizations
 */
export async function createOrganization(req: Request, res: Response): Promise<void> {
    try {
        const { name, inviteCode: customInviteCode } = req.body;

        if (!name) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: '団体名は必須です' }
            });
            return;
        }

        let inviteCode = customInviteCode;

        // カスタムコードがない場合はランダム生成 (8文字英数字)
        if (!inviteCode) {
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            inviteCode = result;
        }

        const organization = await prisma.organization.create({
            data: {
                name,
                inviteCode,
            }
        });

        // 監査ログ記録: 団体作成
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'ORG_CREATE',
                category: 'ORG',
                organizationId: organization.id,
                targetId: organization.id,
                payload: { name, inviteCode },
                isSystemAdminAction: true,
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(201).json({
            success: true,
            data: organization
        });
    } catch (error) {
        // P2002: Unique constraint failed
        if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('inviteCode')) {
            res.status(409).json({
                success: false,
                error: { code: 'INVITE_CODE_EXISTS', message: 'この招待コードは既に使用されています' }
            });
            return;
        }
        logger.error('Create organization error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '団体の作成に失敗しました' }
        });
    }
}

/**
 * 団体更新 (SYSTEM_ADMIN)
 * PATCH /api/v1/organizations/:orgId
 */
export async function updateOrganization(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { name, isActive } = req.body;

        const organization = await prisma.organization.update({
            where: { id: orgId },
            data: {
                name,
                isActive
            }
        });

        // 監査ログ記録: 団体更新
        try {
            const changes: any = {};
            if (name !== undefined) changes.name = name;
            if (isActive !== undefined) changes.isActive = isActive;

            await createAuditLog({
                userId: req.user!.id,
                action: 'ORG_UPDATE',
                category: 'ORG',
                organizationId: orgId,
                targetId: orgId,
                payload: { changes },
                isSystemAdminAction: true,
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.json({
            success: true,
            data: organization
        });
    } catch (error) {
        // P2025: Record to update not found
        if ((error as any).code === 'P2025') {
            res.status(404).json({
                success: false,
                error: { code: 'ORG_NOT_FOUND', message: '団体が見つかりません' }
            });
            return;
        }
        logger.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '団体の更新に失敗しました' }
        });
    }
}

/**
 * 招待コード再発行 (SYSTEM_ADMIN)
 * POST /api/v1/organizations/:orgId/regenerate-invite
 */
export async function regenerateInviteCode(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { inviteCode: customInviteCode } = req.body;

        let newInviteCode = customInviteCode;

        // カスタムコードがない場合はランダム生成 (8文字英数字)
        if (!newInviteCode) {
            const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            newInviteCode = result;
        }

        const oldOrg = await prisma.organization.findUnique({ where: { id: orgId } });

        const organization = await prisma.organization.update({
            where: { id: orgId },
            data: { inviteCode: newInviteCode }
        });

        // 監査ログ記録: 招待コード再発行
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'ORG_INVITE_REGEN',
                category: 'ORG',
                organizationId: orgId,
                targetId: orgId,
                payload: { oldCode: oldOrg?.inviteCode, newCode: newInviteCode },
                isSystemAdminAction: true,
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.json({
            success: true,
            data: {
                newInviteCode: organization.inviteCode
            }
        });
    } catch (error) {
        // P2002: Unique constraint failed
        if ((error as any).code === 'P2002' && (error as any).meta?.target?.includes('inviteCode')) {
            res.status(409).json({
                success: false,
                error: { code: 'INVITE_CODE_EXISTS', message: 'この招待コードは既に使用されています' }
            });
            return;
        }
        if ((error as any).code === 'P2025') {
            res.status(404).json({
                success: false,
                error: { code: 'ORG_NOT_FOUND', message: '団体が見つかりません' }
            });
            return;
        }
        logger.error('Regenerate invite code error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '招待コードの再発行に失敗しました' }
        });
    }
}
