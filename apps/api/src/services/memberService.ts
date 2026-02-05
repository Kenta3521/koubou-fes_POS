
import prisma from '../utils/prisma.js';
import { Role } from '@koubou-fes-pos/shared';

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
 * メンバーの権限（または承認ステータス）を更新
 */
export const updateMember = async (organizationId: string, userId: string, data: { role: Role }) => {
    return prisma.userOrganization.update({
        where: {
            userId_organizationId: {
                userId,
                organizationId
            }
        },
        data: {
            role: data.role as any // Prisma enum type mismatch workaround
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            }
        }
    });
};

/**
 * メンバーを団体から削除
 */
export const removeMember = async (organizationId: string, userId: string) => {
    // 最後の管理者は削除できないようにチェック
    const membership = await prisma.userOrganization.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId
            }
        }
    });

    if (!membership) {
        throw new Error('MEMBERSHIP_NOT_FOUND');
    }

    if (membership.role === 'ADMIN') {
        const adminCount = await prisma.userOrganization.count({
            where: {
                organizationId,
                role: 'ADMIN'
            }
        });

        if (adminCount <= 1) {
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
