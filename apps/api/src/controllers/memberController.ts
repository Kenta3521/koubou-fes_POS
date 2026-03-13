
import { Request, Response } from 'express';
import * as memberService from '../services/memberService.js';
import { createLogger } from '../utils/logger.js';
import { createAuditLog } from '../services/auditService.js';

const logger = createLogger();

/**
 * メンバー一覧取得
 */
export async function getMembers(req: Request, res: Response): Promise<void> {
    const { orgId } = req.params;
    try {
        const members = await memberService.findAllMembers(orgId);
        res.status(200).json({
            success: true,
            data: members,
        });
    } catch (error) {
        logger.error('Get members error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'メンバーの取得に失敗しました',
            },
        });
    }
}

/**
 * メンバー更新（役割変更・承認）
 */
export async function updateMember(req: Request, res: Response): Promise<void> {
    const { orgId, userId } = req.params;
    const { roleId, permissions } = req.body;

    try {
        const member = await memberService.updateMember(orgId, userId, { roleId, permissions });

        // 監査ログ記録: メンバー更新
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'MEMBER_UPDATE',
                category: 'USER',
                organizationId: orgId,
                targetId: userId,
                payload: { targetUserId: userId, changes: { roleId, permissions } },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(200).json({
            success: true,
            data: member,
        });
    } catch (error: any) {
        logger.error('Update member error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'メンバーの更新に失敗しました',
            },
        });
    }
}

/**
 * メンバー削除
 */
export async function deleteMember(req: Request, res: Response): Promise<void> {
    const { orgId, userId } = req.params;

    try {
        await memberService.removeMember(orgId, userId);

        // 監査ログ記録: メンバー削除
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'MEMBER_REMOVE',
                category: 'USER',
                organizationId: orgId,
                targetId: userId,
                payload: { targetUserId: userId, reason: req.body.reason || 'Removed by admin' },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(200).json({
            success: true,
            message: 'メンバーを削除しました',
        });
    } catch (error: any) {
        logger.error('Delete member error:', error);
        if (error.message === 'CANNOT_REMOVE_LAST_ADMIN') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'CANNOT_REMOVE_LAST_ADMIN',
                    message: '最後の管理者は削除できません',
                },
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'メンバーの削除に失敗しました',
            },
        });
    }
}

/**
 * メンバー追加 (システム管理者専用)
 */
export async function addMember(req: Request, res: Response): Promise<void> {
    const { orgId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        res.status(400).json({
            success: false,
            error: {
                code: 'BAD_REQUEST',
                message: 'ユーザーIDが必要です',
            },
        });
        return;
    }

    try {
        const membership = await memberService.addMember(orgId, userId);

        // 監査ログ記録: メンバー追加
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'MEMBER_ADD',
                category: 'USER',
                organizationId: orgId,
                targetId: userId,
                payload: { newMemberId: userId, addedBy: req.user!.id },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(201).json({
            success: true,
            data: membership,
        });
    } catch (error: any) {
        logger.error('Add member error:', error);

        if (error.message === 'ALREADY_MEMBER') {
            res.status(400).json({
                success: false,
                error: {
                    code: 'ALREADY_MEMBER',
                    message: 'このユーザーは既に団体に所属しています',
                },
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'メンバーの追加に失敗しました',
            },
        });
    }
}
