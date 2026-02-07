import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function reproduce() {
    console.log('🧪 Reproduction: Role Removal by System Admin');

    // 1. Find System Admin
    const admin = await prisma.user.findFirst({ where: { isSystemAdmin: true } });
    if (!admin) {
        console.log('❌ No System Admin found');
        return;
    }
    console.log(`Admin: ${admin.email} (isSystemAdmin: ${admin.isSystemAdmin})`);

    // 2. Find target user and role
    const user = await prisma.user.findUnique({ where: { email: 'staff@yakisoba.example.com' } });
    const org = await prisma.organization.findFirst({ where: { name: '焼きそば部' } });
    const roleId = 'default-staff-role';

    if (!user || !org) {
        console.log('❌ Target user or org not found');
        return;
    }

    // 3. Ensure they ARE assigned
    const assignment = await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: user.id, organizationId: org.id, roleId } },
        update: {},
        create: { userId: user.id, organizationId: org.id, roleId }
    });
    console.log('Assignment ensured.');

    // 4. MOCK API Context (Simulate what the controller receives)
    // We simulate the req.user object as created by authenticate middleware
    const reqUser = {
        id: admin.id,
        email: admin.email,
        isSystemAdmin: admin.isSystemAdmin,
        organizations: [] // System Admin might not be a member
    };

    console.log('\n--- Simulation ---\n');

    // We'll call the logic from roleController manually but with mocked params
    try {
        const role = await prisma.serviceRole.findUnique({ where: { id: roleId } });
        if (!role) throw new Error('Role not found');

        // Logic from Step 3910
        if (role.id === 'default-admin-role' || role.name === '管理者' || role.name === 'ADMIN') {
            const isAuthorized = reqUser.isSystemAdmin || false; // Simplified
            if (!isAuthorized) {
                console.log('❌ Blocked by security guard');
                return;
            }
        }

        // The actual delete
        await prisma.userOrganizationRole.delete({
            where: { userId_organizationId_roleId: { userId: user.id, organizationId: org.id, roleId } }
        });
        console.log('✅ Role removed successfully via Simulation logic!');
    } catch (error: any) {
        console.error('❌ Failed in simulation:', error.message);
    }

    await prisma.$disconnect();
}

reproduce().catch(console.error);
