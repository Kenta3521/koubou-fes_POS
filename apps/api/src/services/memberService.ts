
import prisma from '../utils/prisma.js';
// Role import is removed as we are moving away from it in service logic
// import { Role } from '@koubou-fes-pos/shared'; 

/**
 * 団体の全メンバー（承認待ち含む）を取得
 */
export const findAllMembers = async (organizationId: string) => {
    return prisma.userOrganization.findMany({
        where: { organizationId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    createdAt: true
                }
            },
            roles: {
                include: {
                    role: true
                }
            }
        },
        orderBy: {
            user: {
                name: 'asc'
            }
        }
    });
};

/**
 * メンバーの権限・役割を更新
 */
export const updateMember = async (organizationId: string, userId: string, data: { roleId?: string, permissions?: string[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.permissions !== undefined) {
        updateData.permissions = data.permissions;
    }

    return prisma.$transaction(async (tx) => {
        // Handle Role Update
        if (data.roleId) {
            // Remove existing roles for this organization
            await tx.userOrganizationRole.deleteMany({
                where: {
                    userId,
                    organizationId
                }
            });

            // Add new role
            await tx.userOrganizationRole.create({
                data: {
                    userId,
                    organizationId,
                    roleId: data.roleId
                }
            });
        }

        // Update Member Details (Permissions, etc)
        return tx.userOrganization.update({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId
                }
            },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
    });
};

/**
 * メンバーを団体から削除
 */
export const removeMember = async (organizationId: string, userId: string) => {
    // 所属確認と保持ロールの取得
    const membership = await prisma.userOrganization.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId
            }
        },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    });

    if (!membership) {
        throw new Error('MEMBERSHIP_NOT_FOUND');
    }

    // 管理者ロールを持っているかチェック
    const hasAdminRole = membership.roles.some(ur =>
        ur.role.name === '管理者' || ur.role.name === 'ADMIN'
    );

    if (hasAdminRole) {
        // 組織内の他の管理者の数を確認 (自分以外)
        const otherAdminCount = await prisma.userOrganizationRole.count({
            where: {
                organizationId,
                role: {
                    name: { in: ['管理者', 'ADMIN'] }
                },
                NOT: {
                    userId: userId
                }
            },
        });

        if (otherAdminCount === 0) {
            throw new Error('CANNOT_REMOVE_LAST_ADMIN');
        }
    }

    return prisma.userOrganization.delete({
        where: {
            userId_organizationId: {
                userId,
                organizationId
            }
        }
    });
};

/**
 * 既存ユーザーを団体に追加（システム管理者用）
 */
export const addMember = async (organizationId: string, userId: string) => {
    // すでに所属しているかチェック
    const existing = await prisma.userOrganization.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId
            }
        }
    });

    if (existing) {
        throw new Error('ALREADY_MEMBER');
    }

    // デフォルトロール（スタッフ）を探す
    const defaultRole = await prisma.serviceRole.findFirst({
        where: {
            organizationId: null,
            name: { in: ['スタッフ', 'Staff', 'STAFF'] }
        }
    });

    return prisma.$transaction(async (tx) => {
        // 所属作成
        const membership = await tx.userOrganization.create({
            data: {
                userId,
                organizationId
            }
        });

        // デフォルトロール割り当て
        if (defaultRole) {
            await tx.userOrganizationRole.create({
                data: {
                    userId,
                    organizationId,
                    roleId: defaultRole.id
                }
            });
        }

        return membership;
    });
};
