/**
 * Stripe Location 作成スクリプト (iOS-3-009)
 * display_name: 光芒祭 2026
 *
 * 実行: npx ts-node --esm scripts/create-stripe-location.ts
 *
 * 作成後は systemSetting.stripeLocationId に保存します。
 */
import 'dotenv/config';
import Stripe from 'stripe';
import { PrismaClient } from '../generated/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover' as any,
});

async function main() {
    console.log('🗺️  Stripe Location 作成中...');

    // 既存の Location を確認
    const existingLocations = await stripe.terminal.locations.list({ limit: 10 });
    const existing = existingLocations.data.find(l => l.display_name === '光芒祭 2026');

    let locationId: string;

    if (existing) {
        console.log(`✅ 既存の Location を使用: ${existing.id} (${existing.display_name})`);
        locationId = existing.id;
    } else {
        const location = await stripe.terminal.locations.create({
            display_name: '光芒祭 2026',
            address_kanji: {
                line1: '信州大学 松本キャンパス',
                city: '松本市',
                state: '長野県',
                country: 'JP',
                postal_code: '390-8621',
            },
            address_kana: {
                line1: 'シンシュウダイガク マツモトキャンパス',
                city: 'マツモトシ',
                state: 'ナガノケン',
                country: 'JP',
                postal_code: '390-8621',
            },
        } as any);
        console.log(`✅ Location 作成完了: ${location.id} (${location.display_name})`);
        locationId = location.id;
    }

    // SystemSetting に保存
    await prisma.systemSetting.update({
        where: { id: 'singleton' },
        data: { stripeLocationId: locationId },
    });

    console.log(`✅ SystemSetting.stripeLocationId に保存: ${locationId}`);
    console.log('');
    console.log('📋 .env に以下を追加することを推奨:');
    console.log(`STRIPE_LOCATION_ID=${locationId}`);

    await pool.end();
}

main().catch(err => {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
});
