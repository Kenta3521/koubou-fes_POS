/**
 * JWT トークン生成・検証ユーティリティ
 * Phase 1: P1-011 ログインAPI実装
 */

import jwt from 'jsonwebtoken';
import { JWTPayload } from '@koubou-fes-pos/shared';

// 環境変数から設定を取得
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * JWTトークンを生成
 * @param payload ユーザー情報
 * @returns JWT トークン文字列
 */
export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
}

/**
 * JWTトークンを検証
 * @param token JWT トークン文字列
 * @returns デコードされたペイロード
 * @throws トークンが無効または期限切れの場合
 */
export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * パスワードリセット用トークンを生成 (有効期限15分)
 * @param userId ユーザーID
 * @returns JWT トークン文字列
 */
export function generateResetToken(userId: string): string {
    return jwt.sign({ userId, purpose: 'password_reset' }, JWT_SECRET, {
        expiresIn: '15m',
    });
}

/**
 * パスワードリセット用トークンを検証
 * @param token JWT トークン文字列
 * @returns デコードされたペイロード ({ userId, purpose })
 */
export function verifyResetToken(token: string): { userId: string; purpose: string } {
    return jwt.verify(token, JWT_SECRET) as { userId: string; purpose: string };
}
