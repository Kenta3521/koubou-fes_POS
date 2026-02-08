
import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

/**
 * 全権限リスト取得 (Global)
 * GET /api/v1/permissions
 */
export async function listPermissions(req: Request, res: Response): Promise<void> {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { category: 'asc' }
        });
        res.status(200).json({ success: true, data: permissions });
    } catch (error) {
        logger.error('List permissions error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '権限リストの取得に失敗しました' } });
    }
}

/**
 * 組織のロール一覧取得
 * GET /api/v1/organizations/:orgId/roles
 */
export async function listRoles(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const roles = await prisma.serviceRole.findMany({
            where: {
                OR: [
                    { organizationId: orgId },
                    { organizationId: null }
                ]
            },
            include: {
                permissions: {
                    include: { permission: true }
                },
                _count: {
                    select: { userRoles: true }
                }
            },
            orderBy: [
                { isSystemRole: 'desc' }, // Admin/Staff first
                { name: 'asc' }
            ]
        });

        // Backend returns structured data. Frontend can flatten permissions if needed.
        const formattedRoles = roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystemRole: role.isSystemRole, // Use DB field
            organizationId: role.organizationId,
            permissions: role.permissions.map(rp => rp.permission.code),
            memberCount: role._count.userRoles
        }));

        res.status(200).json({ success: true, data: formattedRoles });
    } catch (error) {
        logger.error('List roles error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ロール一覧の取得に失敗しました' } });
    }
}

/**
 * ロール作成
 * POST /api/v1/organizations/:orgId/roles
 */
export async function createRole(req: Request, res: Response): Promise<void> {
    try {
        const { orgId } = req.params;
        const { name, description, permissionCodes } = req.body; // permissionCodes: string[]

        if (!name) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ロール名は必須です' } });
            return;
        }

        // 1. Resolve permission codes to IDs
        const permissions = await prisma.permission.findMany({
            where: { code: { in: permissionCodes || [] } }
        });

        const role = await prisma.serviceRole.create({
            data: {
                name,
                description,
                organizationId: orgId,
                permissions: {
                    create: permissions.map(p => ({
                        permissionId: p.id
                    }))
                }
            },
            include: {
                permissions: { include: { permission: true } }
            }
        });

        res.status(201).json({ success: true, data: role });
    } catch (error) {
        logger.error('Create role error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ロールの作成に失敗しました' } });
    }
}

/**
 * ロール更新
 * PUT /api/v1/organizations/:orgId/roles/:roleId
 */
export async function updateRole(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, roleId } = req.params;
        const { name, description, permissionCodes } = req.body;

        // Verify org context
        const existing = await prisma.serviceRole.findFirst({
            where: { id: roleId, organizationId: orgId }
        });

        if (!existing) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ロールが見つかりません' } });
            return;
        }

        if (existing.organizationId === null) {
            // Editing a common/global role
            // Only System Admin can edit common roles
            if (!req.user || !req.user.isSystemAdmin) {
                res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: '共通ロールの編集はシステム管理者のみ可能です' } });
                return;
            }
        } else {
            // Editing an Org role
            // Ensure it belongs to the target Org (already checked by findFirst query, but to be safe)
            if (existing.organizationId !== orgId) {
                res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: '他組織のロールは編集できません' } });
                return;
            }
        }

        // Transaction updates
        const result = await prisma.$transaction(async (tx) => {
            await tx.serviceRole.update({
                where: { id: roleId },
                data: { name, description }
            });

            if (permissionCodes) {
                // Determine IDs
                const permissions = await tx.permission.findMany({
                    where: { code: { in: permissionCodes } }
                });

                // Prevent Org Admins from assigning system:manage or other system:* permissions if they don't have it?
                // For now, let's assume filtering is done at UI or verify user has 'system:manage' if assigning 'system:*'
                // This logic is complex, let's stick to the basic protection first.

                // Update relationships: Delete all and re-create (simplest strategy for complete replacement)
                // Use deleteMany on RolePermission
                await tx.rolePermission.deleteMany({
                    where: { roleId: roleId }
                });

                if (permissions.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissions.map(p => ({
                            roleId: roleId,
                            permissionId: p.id
                        }))
                    });
                }
            }

            // Return full object
            return tx.serviceRole.findUnique({
                where: { id: roleId },
                include: { permissions: { include: { permission: true } } }
            });
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        logger.error('Update role error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ロールの更新に失敗しました' } });
    }
}

/**
 * ロール削除
 * DELETE /api/v1/organizations/:orgId/roles/:roleId
 */
export async function deleteRole(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, roleId } = req.params;

        // Verify role exists and belongs to org
        const role = await prisma.serviceRole.findFirst({
            where: { id: roleId, organizationId: orgId },
            include: { _count: { select: { userRoles: true } } }
        });

        if (!role) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ロールが見つかりません' } });
            return;
        }

        // Prevent deletion if initialized or used by users?
        // Let's prevent if users are assigned.
        if (role._count.userRoles > 0) {
            res.status(400).json({
                success: false,
                error: { code: 'ROLE_IN_USE', message: 'このロールはユーザーに割り当てられているため削除できません' }
            });
            return;
        }

        await prisma.serviceRole.delete({ where: { id: roleId } });

        res.status(200).json({ success: true, message: 'ロールを削除しました' });
    } catch (error) {
        logger.error('Delete role error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ロールの削除に失敗しました' } });
    }
}

/**
 * ロールに割り当てられたメンバー一覧取得
 * GET /api/v1/organizations/:orgId/roles/:roleId/members
 */
export async function listRoleMembers(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, roleId } = req.params;

        const roleWithMembers = await prisma.serviceRole.findUnique({
            where: { id: roleId },
            include: {
                userRoles: {
                    include: {
                        userOrganization: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!roleWithMembers || (roleWithMembers.organizationId && roleWithMembers.organizationId !== orgId)) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ロールが見つかりません' } });
            return;
        }

        const members = roleWithMembers.userRoles.map(ur => ({
            id: ur.userOrganization.user.id,
            name: ur.userOrganization.user.name,
            email: ur.userOrganization.user.email,
            assignedAt: ur.createdAt
        }));

        res.status(200).json({ success: true, data: members });
    } catch (error) {
        logger.error('List role members error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'メンバー一覧の取得に失敗しました' } });
    }
}

/**
 * ユーザーにロールを割り当て
 * POST /api/v1/organizations/:orgId/roles/:roleId/members
 */
export async function assignRoleToMember(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, roleId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ユーザーIDは必須です' } });
            return;
        }

        // 組織内でのメンバーシップ確認
        const membership = await prisma.userOrganization.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } }
        });

        if (!membership) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '指定されたユーザーはこの組織に所属していません' } });
            return;
        }

        // ロールの存在確認
        const role = await prisma.serviceRole.findUnique({ where: { id: roleId } });
        if (!role || (role.organizationId && role.organizationId !== orgId)) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ロールが見つかりません' } });
            return;
        }

        // セキュリティガード: 「管理者」ロールの操作制限
        // IDが 'default-admin-role' ではない場合でも名前でチェック
        if (role.id === 'default-admin-role' || role.name === '管理者' || role.name === 'ADMIN') {
            // 操作者がシステム管理者であるか、組織の 'org:update' 権限を持っているか確認
            const isAuthorized = req.user?.isSystemAdmin || req.user?.organizations.find(o => o.id === orgId)?.permissions?.includes('org:update');
            if (!isAuthorized) {
                res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: '管理者ロールの割り当てには、組織の管理者権限 (org:update) が必要です' } });
                return;
            }
        }

        // 割り当て作成 (upsert的に扱う)
        await prisma.userOrganizationRole.upsert({
            where: {
                userId_organizationId_roleId: { userId, organizationId: orgId, roleId }
            },
            update: {},
            create: { userId, organizationId: orgId, roleId }
        });

        res.status(200).json({ success: true, message: 'ロールを割り当てました' });
    } catch (error) {
        logger.error('Assign role error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ロールの割り当てに失敗しました' } });
    }
}

/**
 * ユーザーからロールの割り当てを解除
 * DELETE /api/v1/organizations/:orgId/roles/:roleId/members/:userId
 */
export async function removeRoleFromMember(req: Request, res: Response): Promise<void> {
    try {
        const { orgId, roleId, userId } = req.params;

        // 最後の管理者削除チェックを here ではなく userService または専用バリデータで行うべきだが、
        // 今回はとりあえずそのまま削除。userService.leaveOrganization には同様のロジックがある。
        // ※ 複数ロール化により、特定のロール（管理者）を外す際に他の管理者ロールが残っているかチェックが必要。

        const role = await prisma.serviceRole.findUnique({ where: { id: roleId } });
        if (!role) {
            res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'ロールが見つかりません' } });
            return;
        }

        // セキュリティガード: 「管理者」ロールの操作制限
        if (role.id === 'default-admin-role' || role.name === '管理者' || role.name === 'ADMIN') {
            // 組織内の他の管理者の数を確認 (自分以外)
            const otherAdminCount = await prisma.userOrganizationRole.count({
                where: {
                    organizationId: orgId,
                    role: { OR: [{ id: 'default-admin-role' }, { name: { in: ['管理者', 'ADMIN'] } }] },
                    NOT: { userId: userId }
                }
            });

            if (otherAdminCount === 0) {
                res.status(400).json({ success: false, error: { code: 'CANNOT_REMOVE_LAST_ADMIN', message: '組織内の最後の管理者を削除することはできません' } });
                return;
            }

            // 操作者がシステム管理者であるか、組織の 'org:update' 権限を持っているか確認
            const isAuthorized = req.user?.isSystemAdmin || req.user?.organizations.find(o => o.id === orgId)?.permissions?.includes('org:update');
            if (!isAuthorized) {
                res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: '管理者ロールの解除には、組織の管理者権限 (org:update) が必要です' } });
                return;
            }
        }

        await prisma.userOrganizationRole.delete({
            where: {
                userId_organizationId_roleId: { userId, organizationId: orgId, roleId }
            }
        });

        res.status(200).json({ success: true, message: 'ロールの割り当てを解除しました' });
    } catch (error) {
        logger.error('Remove role error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'ロールの解除に失敗しました' } });
    }
}
