

import prisma from '../utils/prisma.js'; // Use shared client if available, or imports
// If shared client is not easily importable in script context without build, we can use local instance.
// But better to use the one from utils if possible. Re-checking usage in other scripts.
// debug_dashboard_data.ts uses: import { prisma, closePrisma } from '../utils/prisma.js';

// Define Permissions List
// Define Permissions List
// Define Permissions List
const PERMISSIONS = [
    // Member
    { code: 'member:read', category: 'Member', description: 'メンバー一覧の閲覧' },
    { code: 'member:delete', category: 'Member', description: 'メンバーの削除' },
    { code: 'member:management', category: 'Member', description: 'スタッフ管理の全操作を許可' },

    // Role
    { code: 'role:read', category: 'Role', description: 'ロールの閲覧' },
    { code: 'role:create', category: 'Role', description: 'ロールの作成' },
    { code: 'role:update', category: 'Role', description: 'ロールの編集' },
    { code: 'role:delete', category: 'Role', description: 'ロールの削除' },
    { code: 'role:assign', category: 'Role', description: 'メンバーへのロール割当' },
    { code: 'role:management', category: 'Role', description: 'ロール管理の全操作を許可' },

    // Category
    { code: 'category:read', category: 'Category', description: 'カテゴリ一覧の閲覧' },
    { code: 'category:create', category: 'Category', description: 'カテゴリ作成' },
    { code: 'category:update', category: 'Category', description: 'カテゴリ編集' },
    { code: 'category:delete', category: 'Category', description: 'カテゴリ削除' },
    { code: 'category:management', category: 'Category', description: 'カテゴリの全操作を許可' },

    // Product
    { code: 'product:read', category: 'Product', description: '商品一覧の閲覧' },
    { code: 'product:create', category: 'Product', description: '商品作成' },
    { code: 'product:update', category: 'Product', description: '商品編集' },
    { code: 'product:delete', category: 'Product', description: '商品削除' },
    { code: 'product:stock', category: 'Product', description: '在庫数調整' },
    { code: 'product:management', category: 'Product', description: '商品の全操作を許可' },

    // Discount
    { code: 'discount:read', category: 'Discount', description: '割引一覧の閲覧' },
    { code: 'discount:create', category: 'Discount', description: '割引作成' },
    { code: 'discount:update', category: 'Discount', description: '割引編集' },
    { code: 'discount:delete', category: 'Discount', description: '割引削除' },
    { code: 'discount:management', category: 'Discount', description: '割引の全操作を許可' },

    // Transaction
    { code: 'transaction:read', category: 'Transaction', description: '取引履歴の閲覧' },
    { code: 'transaction:create', category: 'Transaction', description: '取引作成 (POS操作)' },
    { code: 'transaction:cancel', category: 'Transaction', description: '取引キャンセル' },
    { code: 'transaction:refund', category: 'Transaction', description: '返金処理' },
    { code: 'transaction:management', category: 'Transaction', description: '取引の全操作を許可' },

    // Report
    { code: 'report:read', category: 'Report', description: 'レジ締め履歴の閲覧' },
    { code: 'report:create', category: 'Report', description: 'レジ締め実行' },
    { code: 'report:management', category: 'Report', description: 'レポート管理の全操作を許可' },

    // Dashboard
    { code: 'dashboard:view', category: 'Dashboard', description: '団体ダッシュボードの閲覧' },
    { code: 'dashboard:management', category: 'Dashboard', description: 'ダッシュボード管理の全操作を許可' },
] as const;

// Define Roles and their Permissions
const ROLE_DEFINITIONS = {
    ADMIN: {
        name: '管理者',
        description: '団体内の全ての操作が可能（組織管理を除く）',
        permissions: PERMISSIONS.map(p => p.code), // Admin gets everything defined here
    },
    STAFF: {
        name: 'スタッフ',
        description: 'POSレジ操作と閲覧のみ',
        permissions: [
            // POS Operation
            'transaction:create',
            'transaction:read', // History
            // Component Read Access
            'category:read',
            'product:read',
            'discount:read',
            // Dashboard (View Only)
            'dashboard:view',
        ],
    },
};

async function main() {
    console.log('🚀 Starting RBAC Seeding...');

    // 1. Upsert Permissions
    console.log('1. Seeding Permissions...');
    for (const p of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { code: p.code },
            update: {
                category: p.category,
                description: p.description,
                name: p.description,
            },
            create: {
                code: p.code,
                category: p.category,
                description: p.description,
                name: p.description,
            },
        });
    }
    console.log(`   - Synced ${PERMISSIONS.length} permissions.`);

    // 1.5 Clean up orphaned permissions (Delete what's not in the list)
    const validCodes = PERMISSIONS.map(p => p.code);
    const orphanedPermissions = await prisma.permission.findMany({
        where: { code: { notIn: validCodes as any } }
    });

    if (orphanedPermissions.length > 0) {
        const orphanedIds = orphanedPermissions.map((p: { id: string }) => p.id);

        // Delete RolePermission first due to lack of cascade in schema
        await prisma.rolePermission.deleteMany({
            where: { permissionId: { in: orphanedIds } }
        });

        // Delete Permissions
        await prisma.permission.deleteMany({
            where: { id: { in: orphanedIds } }
        });

        console.log(`   - Deleted ${orphanedPermissions.length} orphaned permissions and their associations.`);
    }


    // 2. Setup Global Roles
    console.log('2. Setting up Global ServiceRoles...');
    const allPermissions = await prisma.permission.findMany();
    const permMap = new Map<string, string>(allPermissions.map((p: any) => [p.code, p.id]));

    // Create Global ADMIN Role
    const globalAdminRole = await upsertRole(null, ROLE_DEFINITIONS.ADMIN.name, ROLE_DEFINITIONS.ADMIN.description, ROLE_DEFINITIONS.ADMIN.permissions, permMap);

    // Create Global STAFF Role
    const globalStaffRole = await upsertRole(null, ROLE_DEFINITIONS.STAFF.name, ROLE_DEFINITIONS.STAFF.description, ROLE_DEFINITIONS.STAFF.permissions, permMap);

    console.log('   - Default Global Roles upserted.');

    // 3. Migrate Users (Link to Global Roles if using Legacy Roles)
    console.log('3. Migrating Users to Global Roles...');
    const organizations = await prisma.organization.findMany();

    for (const org of organizations) {
        // Find users who don't have roleId yet
        const members = await prisma.userOrganization.findMany({
            where: { organizationId: org.id },
        });

        for (const member of (members as any[])) {
            // Map Enum Role to GLOBAL Service Role ID
            let targetRoleId = null;
            if (member.role === 'ADMIN') targetRoleId = globalAdminRole.id;
            if (member.role === 'STAFF') targetRoleId = globalStaffRole.id;

            if (targetRoleId) {
                // Check if already has this role
                const existing = await prisma.userOrganizationRole.findUnique({
                    where: {
                        userId_organizationId_roleId: {
                            userId: member.userId,
                            organizationId: member.organizationId,
                            roleId: targetRoleId
                        }
                    }
                });

                if (!existing) {
                    await prisma.userOrganizationRole.create({
                        data: {
                            userId: member.userId,
                            organizationId: member.organizationId,
                            roleId: targetRoleId,
                        }
                    });
                }
            }
        }
    }
    console.log('4. User Role Migration completed.');
}

async function upsertRole(orgId: string | null, name: string, description: string, permissionCodes: string[], permMap: Map<string, string>) {
    // Check if role exists by name
    let role = await prisma.serviceRole.findFirst({
        where: { organizationId: orgId, name: name },
    });

    if (!role) {
        role = await prisma.serviceRole.create({
            data: {
                organizationId: orgId,
                name: name,
                description: description,
            },
        });
        console.log(`   - Created role "${name}" for org ${orgId ?? 'GLOBAL'}`);
    }

    // Update Role Permissions
    // First, delete existing
    await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
    });

    // Insert new
    const data = permissionCodes.map(code => {
        const permId = permMap.get(code);
        if (!permId) console.warn(`Warning: Permission code ${code} not found in DB`);
        return permId ? { roleId: role!.id, permissionId: permId } : null;
    }).filter(x => x !== null) as { roleId: string, permissionId: string }[];

    if (data.length > 0) {
        await prisma.rolePermission.createMany({ data });
    }

    return role;
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
