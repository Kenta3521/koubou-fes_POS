import prisma from '../utils/prisma.js';
import type { User } from '@prisma/client';
import { UpdateProfileRequest } from '@koubou-fes-pos/shared';

/**
 * ユーザープロフィールの更新
 * @param userId 更新対象のユーザーID
 * @param data 更新内容
 * @returns 更新されたユーザー情報 (パスワードハッシュを除く)
 */
export async function updateProfile(
    userId: string,
    data: UpdateProfileRequest
): Promise<Omit<User, 'passwordHash'>> {
    const { name, email } = data;

    // 更新内容がない場合は現在のデータを返す
    if (!name && !email) {
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!currentUser) throw new Error('USER_NOT_FOUND');
        const { passwordHash: _passwordHash, ...userWithoutPassword } = currentUser;
        return userWithoutPassword;
    }

    // トランザクションの使用は必須ではないが、チェックと更新を一貫させる
    return await prisma.$transaction(async (tx) => {
        // ユーザー存在確認
        const user = await tx.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        // メールアドレス変更時の重複チェック
        if (email && email !== user.email) {
            const existingUser = await tx.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }
        }

        // 更新実行
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email : undefined,
            },
        });

        // パスワードハッシュを除外して返却
        const { passwordHash: _passwordHash, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    });
}

/**
 * 団体への参加（招待コード使用）
 * @param userId ユーザーID
 * @param inviteCode 招待コード
 * @returns 参加した団体の情報と役割
 */
export async function joinOrganization(
    userId: string,
    inviteCode: string
): Promise<{ id: string; name: string; role: string; organizationId: string }> {
    // 招待コードで団体を検索
    const organization = await prisma.organization.findUnique({
        where: { inviteCode },
    });

    if (!organization) {
        throw new Error('ORG_INVALID_INVITE_CODE');
    }

    if (!organization.isActive) {
        throw new Error('ORG_INACTIVE');
    }

    // 既に所属しているか確認
    const existingMembership = await prisma.userOrganization.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId: organization.id,
            },
        },
    });

    if (existingMembership) {
        throw new Error('ORG_ALREADY_JOINED');
    }

    // デフォルトロール（スタッフ）を取得
    const defaultRole = await prisma.serviceRole.findFirst({
        where: {
            organizationId: null,
            name: { in: ['スタッフ', 'Staff', 'STAFF'] }
        }
    });

    // トランザクションで参加処理
    return await prisma.$transaction(async (tx) => {
        // メンバーシップ作成
        await tx.userOrganization.create({
            data: {
                userId,
                organizationId: organization.id,
            },
        });

        // ロール割り当て
        if (defaultRole) {
            await tx.userOrganizationRole.create({
                data: {
                    userId,
                    organizationId: organization.id,
                    roleId: defaultRole.id,
                }
            });
        }

        return {
            id: organization.id,
            organizationId: organization.id,
            name: organization.name,
            role: defaultRole?.name || 'Staff',
        };
    });
}

/**
 * 団体からの脱退
 * @param userId ユーザーID
 * @param organizationId 団体ID
 * @returns 脱退した団体ID
 */
export async function leaveOrganization(
    userId: string,
    organizationId: string
): Promise<{ organizationId: string }> {
    // 所属確認
    const membership = await prisma.userOrganization.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId,
            },
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
        throw new Error('ORG_NOT_FOUND');
    }

    // 最後の管理者チェック
    // 割り当てられているロールの中に「管理者」または「ADMIN」があるかチェック
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
            throw new Error('CANNOT_LEAVE_AS_LAST_ADMIN');
        }
    }

    // 脱退処理（メンバーシップ削除。カスケード設定により割り当ても削除される）
    await prisma.userOrganization.delete({
        where: {
            userId_organizationId: {
                userId,
                organizationId,
            },
        },
    });

    return { organizationId };
}
