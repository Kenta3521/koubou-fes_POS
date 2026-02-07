/**
 * Prisma Client インスタンス
 * Phase 1: データベースアクセス
 */

import 'dotenv/config';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

// PostgreSQL接続プール
// DATABASE_URLから接続情報を取得
const connectionString = process.env.DATABASE_URL;
console.log('Database connection string:', connectionString ? 'Set' : 'Not set');

// 接続プールとPrismaクライアントをグローバルで保持し、ホットリロード時のリソースリークを防ぐ
let pool: pg.Pool;
let prisma: PrismaClientType;

if (process.env.NODE_ENV === 'production') {
    pool = new Pool({ connectionString, ssl: false });
    prisma = new PrismaClient({
        adapter: new PrismaPg(pool),
        log: ['error'],
    });
} else {
    // 開発時はグローバル変数に保存して再利用
    if (!(global as any).pool) {
        (global as any).pool = new Pool({ connectionString, ssl: false });
    }
    pool = (global as any).pool;

    if (!(global as any).prisma) {
        (global as any).prisma = new PrismaClient({
            adapter: new PrismaPg(pool),
            log: ['query', 'error', 'warn'],
        });
    }
    prisma = (global as any).prisma;
}

/**
 * クリーンアップ処理
 */
export const closePrisma = async () => {
    await prisma.$disconnect();
    await pool.end();
};

export default prisma;
