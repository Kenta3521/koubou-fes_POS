import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting seed...');

    // パスワードハッシュ生成
    const hashedPassword = await bcrypt.hash('password123', 10);

    // システム設定（シングルトン）
    console.log('Creating system settings...');
    await prisma.systemSetting.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            eventDate: new Date('2026-11-01'),
            eventStartTime: '10:00',
            eventEndTime: '17:00',
            systemEnabled: true,
            paypayEnabled: true,
            paypayQrTimeout: 300,
        },
    });

    // システム管理者（実行委員会）の作成
    console.log('Creating system admin user...');
    const systemAdmin = await prisma.user.upsert({
        where: { email: 'admin@koubou-fes.example.com' },
        update: {},
        create: {
            email: 'admin@koubou-fes.example.com',
            passwordHash: hashedPassword,
            name: '実行委員会',
            isSystemAdmin: true,
            status: 'ACTIVE',
        },
    });

    // テスト用団体1: 焼きそば部
    console.log('Creating test organization 1: 焼きそば部...');
    const org1 = await prisma.organization.upsert({
        where: { inviteCode: 'YAKISOBA2026' },
        update: {},
        create: {
            name: '焼きそば部',
            inviteCode: 'YAKISOBA2026',
            isActive: true,
        },
    });

    // 団体1のリーダー
    const leader1 = await prisma.user.upsert({
        where: { email: 'leader@yakisoba.example.com' },
        update: {},
        create: {
            email: 'leader@yakisoba.example.com',
            passwordHash: hashedPassword,
            name: '焼きそば太郎',
            status: 'ACTIVE',
        },
    });

    await prisma.userOrganization.upsert({
        where: {
            userId_organizationId: {
                userId: leader1.id,
                organizationId: org1.id,
            },
        },
        update: {},
        create: {
            userId: leader1.id,
            organizationId: org1.id,
            role: 'ADMIN',
        },
    });

    // 団体1のスタッフ
    const staff1 = await prisma.user.upsert({
        where: { email: 'staff@yakisoba.example.com' },
        update: {},
        create: {
            email: 'staff@yakisoba.example.com',
            passwordHash: hashedPassword,
            name: '焼きそば花子',
            status: 'ACTIVE',
        },
    });

    await prisma.userOrganization.upsert({
        where: {
            userId_organizationId: {
                userId: staff1.id,
                organizationId: org1.id,
            },
        },
        update: {},
        create: {
            userId: staff1.id,
            organizationId: org1.id,
            role: 'STAFF',
        },
    });

    // 団体1のカテゴリ
    const category1 = await prisma.category.create({
        data: {
            organizationId: org1.id,
            name: '焼きそば',
            sortOrder: 1,
        },
    });

    const category2 = await prisma.category.create({
        data: {
            organizationId: org1.id,
            name: '飲み物',
            sortOrder: 2,
        },
    });

    // 団体1の商品
    await prisma.product.createMany({
        data: [
            {
                organizationId: org1.id,
                categoryId: category1.id,
                name: '焼きそば（並）',
                price: 400,
                stock: 50,
                isActive: true,
            },
            {
                organizationId: org1.id,
                categoryId: category1.id,
                name: '焼きそば（大）',
                price: 500,
                stock: 30,
                isActive: true,
            },
            {
                organizationId: org1.id,
                categoryId: category2.id,
                name: 'お茶',
                price: 100,
                stock: 100,
                isActive: true,
            },
            {
                organizationId: org1.id,
                categoryId: category2.id,
                name: 'コーラ',
                price: 150,
                stock: 80,
                isActive: true,
            },
        ],
    });

    // 団体1の割引設定
    await prisma.discount.create({
        data: {
            organizationId: org1.id,
            name: '学生割引',
            type: 'FIXED',
            value: 50,
            isActive: true,
        },
    });

    // テスト用団体2: たこ焼き同好会
    console.log('Creating test organization 2: たこ焼き同好会...');
    const org2 = await prisma.organization.upsert({
        where: { inviteCode: 'TAKOYAKI2026' },
        update: {},
        create: {
            name: 'たこ焼き同好会',
            inviteCode: 'TAKOYAKI2026',
            isActive: true,
        },
    });

    const leader2 = await prisma.user.upsert({
        where: { email: 'leader@takoyaki.example.com' },
        update: {},
        create: {
            email: 'leader@takoyaki.example.com',
            passwordHash: hashedPassword,
            name: 'たこ焼き次郎',
            status: 'ACTIVE',
        },
    });

    await prisma.userOrganization.upsert({
        where: {
            userId_organizationId: {
                userId: leader2.id,
                organizationId: org2.id,
            },
        },
        update: {},
        create: {
            userId: leader2.id,
            organizationId: org2.id,
            role: 'ADMIN',
        },
    });

    // 団体2のカテゴリと商品
    const category3 = await prisma.category.create({
        data: {
            organizationId: org2.id,
            name: 'たこ焼き',
            sortOrder: 1,
        },
    });

    await prisma.product.createMany({
        data: [
            {
                organizationId: org2.id,
                categoryId: category3.id,
                name: 'たこ焼き 6個',
                price: 300,
                stock: 40,
                isActive: true,
            },
            {
                organizationId: org2.id,
                categoryId: category3.id,
                name: 'たこ焼き 12個',
                price: 500,
                stock: 30,
                isActive: true,
            },
        ],
    });

    console.log('✅ Seed completed!');
    console.log('');
    console.log('📋 Created data summary:');
    console.log('- System settings: 1');
    console.log('- Users: 5 (1 system admin, 4 organization members)');
    console.log('- Organizations: 2');
    console.log('- Categories: 3');
    console.log('- Products: 6');
    console.log('- Discounts: 1');
    console.log('');
    console.log('🔐 Login credentials (password: password123):');
    console.log('  System Admin: admin@koubou-fes.example.com');
    console.log('  焼きそば部 Admin: leader@yakisoba.example.com');
    console.log('  焼きそば部 Staff: staff@yakisoba.example.com');
    console.log('  たこ焼き同好会 Admin: leader@takoyaki.example.com');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
