/**
 * Prisma Client インスタンス
 * Phase 1: データベースアクセス
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

// PostgreSQL接続プール
// DATABASE_URLから接続情報を取得
const connectionString = process.env.DATABASE_URL;
console.log('Database connection string:', connectionString ? 'Set' : 'Not set');

const pool = new Pool({
    connectionString,
    // 明示的な設定
    ssl: false,
});

// Prismaクライアントのシングルトンインスタンス
const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
