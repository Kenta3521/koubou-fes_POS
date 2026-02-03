/**
 * 認証サービス
 * Phase 1: P1-011 ログインAPI実装
 * ビジネスロジックを担当
 */

import bcrypt from 'bcrypt';
import { LoginResponse, JWTPayload, Role, UserStatus } from '@koubou-fes-pos/shared';
import prisma from '../utils/prisma.js';
import { generateToken, generateResetToken, verifyResetToken } from '../utils/jwt.js';

/**
 * ユーザーログイン処理
 * @param email メールアドレス
 * @param password パスワード（平文）
 * @returns ログインレスポンス（トークン + ユーザー情報）
 * @throws 認証失敗時
 */
export async function loginUser(
    email: string,
    password: string
): Promise<LoginResponse> {
    // 1. メールアドレスでユーザー検索（所属団体情報も含む）
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            organizations: {
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });

    // 2. ユーザーが存在しない場合はエラー
    if (!user) {
        throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // 2.5 パスワードハッシュの存在確認
    if (!user.passwordHash) {
        console.error('User passwordHash is missing:', user.id);
        throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // 3. パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // 4. アカウント状態を確認（DB設計書.md UserStatus）
    if (user.status === UserStatus.SUSPENDED) {
        throw new Error('USER_SUSPENDED');
    }
    if (user.status === UserStatus.DEACTIVATED) {
        throw new Error('USER_DEACTIVATED');
    }

    // 5. JWT生成
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        isSystemAdmin: user.isSystemAdmin,
    };
    const token = generateToken(payload);

    // 6. レスポンス形式に整形（API設計書.md 2.1）
    const response: LoginResponse = {
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status as UserStatus,
            isSystemAdmin: user.isSystemAdmin,
            createdAt: user.createdAt,
            organizations: user.organizations.map((uo) => ({
                id: uo.organization.id,
                name: uo.organization.name,
                role: uo.role as Role,
            })),
        },
    };

    return response;
}

/**
 * ユーザー登録処理
 * @param email メールアドレス
 * @param password パスワード（平文）
 * @param name 表示名
 * @param inviteCode 招待コード
 * @returns ログインレスポンス（トークン + ユーザー情報）
 * @throws 登録失敗時
 */
export async function registerUser(
    email: string,
    password: string,
    name: string,
    inviteCode: string
): Promise<LoginResponse> {
    // 1. 招待コードで団体を検索
    const organization = await prisma.organization.findUnique({
        where: { inviteCode },
    });

    if (!organization) {
        throw new Error('ORG_INVALID_INVITE_CODE');
    }

    if (!organization.isActive) {
        throw new Error('ORG_INACTIVE');
    }

    // 2. メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // 3. パスワードのハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Prismaトランザクションでユーザー作成 + 団体メンバーシップ作成
    const user = await prisma.$transaction(async (tx) => {
        // ユーザー作成
        const newUser = await tx.user.create({
            data: {
                email,
                passwordHash,
                name,
                status: UserStatus.ACTIVE,
                isSystemAdmin: false,
            },
        });

        // 団体メンバーシップ作成（デフォルト: STAFF）
        await tx.userOrganization.create({
            data: {
                userId: newUser.id,
                organizationId: organization.id,
                role: Role.STAFF,
            },
        });

        // ユーザー情報を所属団体情報と共に取得
        return await tx.user.findUnique({
            where: { id: newUser.id },
            include: {
                organizations: {
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    });

    if (!user) {
        throw new Error('USER_CREATION_FAILED');
    }

    // 5. JWT生成
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        isSystemAdmin: user.isSystemAdmin,
    };
    const token = generateToken(payload);

    // 6. レスポンス形式に整形
    const response: LoginResponse = {
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status as UserStatus,
            isSystemAdmin: user.isSystemAdmin,
            createdAt: user.createdAt,
            organizations: user.organizations.map((uo) => ({
                id: uo.organization.id,
                name: uo.organization.name,
                role: uo.role as Role,
            })),
        },
    };

    return response;
}

/**
 * パスワードリセット要求処理
 * @param email メールアドレス
 * @returns リセットトークン（開発用）
 */
export async function requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        // セキュリティ上、本来はユーザーの存在有無を明かすべきではないが
        // 開発フェーズであり、トークンをAPIレスポンスで返す仕様のため
        // ここではエラーを投げるか、あるいは空を返す。
        // デバッグのしやすさを優先し、明確なエラーとする。
        // 本番実装時はメール送信を行い、常に「メールを送信しました」と返すこと。
        throw new Error('USER_NOT_FOUND');
    }

    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.SUSPENDED) {
        throw new Error('USER_INACTIVE');
    }

    // リセットトークン生成
    // 正しくは先ほど追加した generateResetToken を使用する
    // こちらは { userId, purpose } を含む
    const resetToken = generateResetToken(user.id);

    return resetToken;
}

/**
 * パスワードリセット実行処理
 * @param token リセットトークン
 * @param newPassword 新しいパスワード
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
    // トークン検証
    const payload = verifyResetToken(token);

    // 用途確認
    if (payload.purpose !== 'password_reset') {
        throw new Error('INVALID_TOKEN_PURPOSE');
    }

    const userId = payload.userId;

    // ユーザー確認
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // パスワード更新
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
    });
}
