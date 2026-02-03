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
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}
