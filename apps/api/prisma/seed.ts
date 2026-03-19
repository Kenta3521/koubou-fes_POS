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

    // --- Phase N: Reorganized Permissions & Roles ---
    console.log('Cleaning up old permissions...');
    // システム・サポートカテゴリの権限を削除（リレーションもPrismaでカスケードか手動で処理）
    // RolePermissionを先に消す必要があるかもしれないが、Prisma Schemaを確認していないため安全策を取る
    const unwantedCategories = ['System', 'Support'];
    const pToDelete = await prisma.permission.findMany({
        where: { category: { in: unwantedCategories } }
    });

    for (const p of pToDelete) {
        // RolePermissionの紐付けを解除
        await prisma.rolePermission.deleteMany({ where: { permissionId: p.id } });
        // 権限自体を削除
        await prisma.permission.delete({ where: { id: p.id } });
    }

    console.log('Creating permissions...');
    const permissions = [
        // Category
        { code: 'category:read', name: 'カテゴリ閲覧', category: 'Category', description: 'カテゴリ一覧の閲覧' },
        { code: 'category:create', name: 'カテゴリ作成', category: 'Category', description: 'カテゴリ作成' },
        { code: 'category:update', name: 'カテゴリ更新', category: 'Category', description: 'カテゴリ編集' },
        { code: 'category:delete', name: 'カテゴリ削除', category: 'Category', description: 'カテゴリ削除' },
        { code: 'category:management', name: 'カテゴリ全管理', category: 'Category', description: 'カテゴリの全操作を許可' },

        // Product
        { code: 'product:read', name: '商品閲覧', category: 'Product', description: '商品一覧の閲覧' },
        { code: 'product:create', name: '商品作成', category: 'Product', description: '商品作成' },
        { code: 'product:update', name: '商品更新', category: 'Product', description: '商品編集' },
        { code: 'product:delete', name: '商品削除', category: 'Product', description: '商品削除' },
        { code: 'product:stock', name: '在庫管理', category: 'Product', description: '在庫数調整' },
        { code: 'product:management', name: '商品全管理', category: 'Product', description: '商品の全操作を許可' },

        // Discount
        { code: 'discount:read', name: '割引閲覧', category: 'Discount', description: '割引一覧の閲覧' },
        { code: 'discount:create', name: '割引作成', category: 'Discount', description: '割引作成' },
        { code: 'discount:update', name: '割引更新', category: 'Discount', description: '割引編集' },
        { code: 'discount:delete', name: '割引削除', category: 'Discount', description: '割引削除' },
        { code: 'discount:management', name: '割引全管理', category: 'Discount', description: '割引の全操作を許可' },

        // Transaction
        { code: 'transaction:read', name: '取引履歴閲覧', category: 'Transaction', description: '取引履歴の閲覧' },
        { code: 'transaction:create', name: 'レジ操作', category: 'Transaction', description: '取引作成 (POS操作)' },
        { code: 'transaction:cancel', name: '取引取消', category: 'Transaction', description: '取引キャンセル・返金' },
        { code: 'transaction:management', name: '取引全管理', category: 'Transaction', description: '取引の全操作を許可' },

        // Dashboard
        { code: 'dashboard:view', name: 'ダッシュボード閲覧', category: 'Dashboard', description: '売上分析・統計の閲覧' },

        // Member
        { code: 'member:read', name: 'スタッフ閲覧', category: 'Member', description: 'スタッフ一覧の閲覧' },
        { code: 'member:invite', name: '招待コード管理', category: 'Member', description: '招待コード閲覧・再生成' },
        { code: 'member:update', name: 'スタッフ更新', category: 'Member', description: '役割変更・権限オーバーライド' },
        { code: 'member:delete', name: 'スタッフ削除', category: 'Member', description: 'メンバーの除名' },
        { code: 'member:management', name: 'スタッフ全管理', category: 'Member', description: 'スタッフ管理の全操作を許可' },

        // Role
        { code: 'role:read', name: 'ロール閲覧', category: 'Role', description: 'ロール構成の閲覧' },
        { code: 'role:create', name: 'ロール作成', category: 'Role', description: 'カスタムロール作成' },
        { code: 'role:update', name: 'ロール更新', category: 'Role', description: 'ロール権限の編集' },
        { code: 'role:delete', name: 'ロール削除', category: 'Role', description: 'ロールの削除' },
        { code: 'role:management', name: 'ロール全管理', category: 'Role', description: 'ロール管理の全操作を許可' },

        // Organization
        { code: 'org:read', name: '団体情報閲覧', category: 'Organization', description: '団体基本情報の閲覧' },
        { code: 'org:update', name: '団体設定更新', category: 'Organization', description: '団体設定の変更' },
        { code: 'org:management', name: '団体全管理', category: 'Organization', description: '団体管理の全操作を許可' },

        // Transaction (Tap to Pay)
        { code: 'enable_tap_to_pay', name: 'タッチ決済の有効化', category: 'Transaction', description: 'iPhoneのタッチ決済（Tap to Pay）の有効化・利用を許可する' },
    ];

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { code: p.code },
            update: p,
            create: p,
        });
    }

    console.log('Creating standard roles...');
    // 1. 管理者ロール (全ての権限)
    const adminRole = await prisma.serviceRole.upsert({
        where: { id: 'default-admin-role' },
        update: { name: '管理者' },
        create: {
            id: 'default-admin-role',
            name: '管理者',
            description: '全ての操作が可能な管理者ロールです',
            isSystemRole: true,
        },
    });

    const allPerms = await prisma.permission.findMany();
    for (const p of allPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: p.id },
        });
    }

    // 2. マネージャーロール (運営全般 + メンバー閲覧)
    const managerRole = await prisma.serviceRole.upsert({
        where: { id: 'default-manager-role' },
        update: { name: 'マネージャー' },
        create: {
            id: 'default-manager-role',
            name: 'マネージャー',
            description: '商品管理や売上確認が可能な実務責任者ロールです',
            isSystemRole: true,
        },
    });

    const managerPermCodes = [
        'category:management', 'product:management', 'discount:management', 'transaction:management',
        'dashboard:view', 'member:read', 'member:update', 'member:invite', 'role:read', 'role:update', 'org:read',
        'enable_tap_to_pay',
    ];
    const managerPerms = await prisma.permission.findMany({ where: { code: { in: managerPermCodes } } });

    // Clear existing permissions to ensure sync
    await prisma.rolePermission.deleteMany({
        where: { roleId: managerRole.id }
    });

    for (const p of managerPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: managerRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: managerRole.id, permissionId: p.id },
        });
    }

    // 3. スタッフロール (レジ操作 + 商品閲覧)
    const staffRole = await prisma.serviceRole.upsert({
        where: { id: 'default-staff-role' },
        update: { name: 'スタッフ' },
        create: {
            id: 'default-staff-role',
            name: 'スタッフ',
            description: 'レジ操作と商品の閲覧が可能な一般スタッフロールです',
            isSystemRole: true,
        },
    });

    const staffPermCodes = ['product:read', 'category:read', 'transaction:create', 'transaction:read'];
    const staffPerms = await prisma.permission.findMany({ where: { code: { in: staffPermCodes } } });
    for (const p of staffPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: staffRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: staffRole.id, permissionId: p.id },
        });
    }

    // 4. 閲覧者ロール (全てのリソースの閲覧のみ)
    const viewerRole = await prisma.serviceRole.upsert({
        where: { id: 'default-viewer-role' },
        update: { name: '閲覧者' },
        create: {
            id: 'default-viewer-role',
            name: '閲覧者',
            description: '設定や履歴の閲覧のみが可能なロールです',
            isSystemRole: true,
        },
    });

    const viewerPerms = await prisma.permission.findMany({ where: { code: { endsWith: ':read' } } });
    // dashboard:viewも追加
    const dashView = await prisma.permission.findUnique({ where: { code: 'dashboard:view' } });
    if (dashView) viewerPerms.push(dashView);

    for (const p of viewerPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: viewerRole.id, permissionId: p.id },
        });
    }

    // --- Organizations & Users ---

    // システム管理者
    console.log('Creating system admin user...');
    await prisma.user.upsert({
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

    // 団体1: 焼きそば部
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
        where: { userId_organizationId: { userId: leader1.id, organizationId: org1.id } },
        update: {},
        create: { userId: leader1.id, organizationId: org1.id },
    });

    await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: leader1.id, organizationId: org1.id, roleId: adminRole.id } },
        update: {},
        create: { userId: leader1.id, organizationId: org1.id, roleId: adminRole.id },
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
        where: { userId_organizationId: { userId: staff1.id, organizationId: org1.id } },
        update: {},
        create: { userId: staff1.id, organizationId: org1.id },
    });

    await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: staff1.id, organizationId: org1.id, roleId: staffRole.id } },
        update: {},
        create: { userId: staff1.id, organizationId: org1.id, roleId: staffRole.id },
    });

    // 団体1のカテゴリ
    console.log('Creating categories for 団体1...');
    let category1 = await prisma.category.findFirst({
        where: { organizationId: org1.id, name: '焼きそば' }
    });
    if (!category1) {
        category1 = await prisma.category.create({
            data: {
                organizationId: org1.id,
                name: '焼きそば',
                sortOrder: 1,
            },
        });
    }

    let category2 = await prisma.category.findFirst({
        where: { organizationId: org1.id, name: '飲み物' }
    });
    if (!category2) {
        category2 = await prisma.category.create({
            data: {
                organizationId: org1.id,
                name: '飲み物',
                sortOrder: 2,
            },
        });
    }

    // 団体1の商品
    console.log('Creating products for 団体1...');
    const products1 = [
        { name: '焼きそば（並）', price: 400, stock: 50, categoryId: category1.id },
        { name: '焼きそば（大）', price: 500, stock: 30, categoryId: category1.id },
        { name: 'お茶', price: 100, stock: 100, categoryId: category2.id },
        { name: 'コーラ', price: 150, stock: 80, categoryId: category2.id },
    ];

    for (const p of products1) {
        const existing = await prisma.product.findFirst({
            where: { organizationId: org1.id, name: p.name }
        });
        if (!existing) {
            await prisma.product.create({
                data: {
                    organizationId: org1.id,
                    categoryId: p.categoryId,
                    name: p.name,
                    price: p.price,
                    stock: p.stock,
                    isActive: true,
                },
            });
        }
    }

    // 団体2: たこ焼き同好会
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
        where: { userId_organizationId: { userId: leader2.id, organizationId: org2.id } },
        update: {},
        create: { userId: leader2.id, organizationId: org2.id },
    });

    await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: leader2.id, organizationId: org2.id, roleId: adminRole.id } },
        update: {},
        create: { userId: leader2.id, organizationId: org2.id, roleId: adminRole.id },
    });

    // 団体2のカテゴリと商品
    console.log('Creating categories for 団体2...');
    let category3 = await prisma.category.findFirst({
        where: { organizationId: org2.id, name: 'たこ焼き' }
    });
    if (!category3) {
        category3 = await prisma.category.create({
            data: {
                organizationId: org2.id,
                name: 'たこ焼き',
                sortOrder: 1,
            },
        });
    }

    console.log('Creating products for 団体2...');
    const products2 = [
        { name: 'たこ焼き 6個', price: 300, stock: 40, categoryId: category3.id },
        { name: 'たこ焼き 12個', price: 500, stock: 30, categoryId: category3.id },
    ];

    for (const p of products2) {
        const existing = await prisma.product.findFirst({
            where: { organizationId: org2.id, name: p.name }
        });
        if (!existing) {
            await prisma.product.create({
                data: {
                    organizationId: org2.id,
                    categoryId: p.categoryId,
                    name: p.name,
                    price: p.price,
                    stock: p.stock,
                    isActive: true,
                },
            });
        }
    }

    console.log('✅ Seed completed!');
    console.log('');
    console.log('🔐 Login credentials (password: password123):');
    console.log('  System Admin: admin@koubou-fes.example.com');
    console.log('  Leader 1: leader@yakisoba.example.com');
    console.log('  Staff 1: staff@yakisoba.example.com');
    console.log('  Leader 2: leader@takoyaki.example.com');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
