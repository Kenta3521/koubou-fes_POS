import 'dotenv/config';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('👤 Creating multi-organization user...');

    const email = 'multi-admin@example.com';
    const name = 'マルチ管理太郎';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get organizations
    const org1 = await prisma.organization.findUnique({ where: { inviteCode: 'YAKISOBA2026' } });
    const org2 = await prisma.organization.findUnique({ where: { inviteCode: 'TAKOYAKI2026' } });

    if (!org1 || !org2) {
        throw new Error('Organizations not found. Please run seed first.');
    }

    // Create user
    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash: hashedPassword },
        create: {
            email,
            passwordHash: hashedPassword,
            name,
            status: 'ACTIVE',
        },
    });

    // Get roles
    const adminRole = await prisma.serviceRole.findFirst({
        where: { name: { in: ['管理者', 'ADMIN'] } }
    });
    const staffRole = await prisma.serviceRole.findFirst({
        where: { name: { in: ['スタッフ', 'STAFF'] } }
    });

    if (!adminRole || !staffRole) {
        throw new Error('Default roles not found. Please check seeding.');
    }

    // Link to Org 1 as ADMIN
    await prisma.userOrganization.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: org1.id } },
        update: {},
        create: { userId: user.id, organizationId: org1.id },
    });
    await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: user.id, organizationId: org1.id, roleId: adminRole.id } },
        update: {},
        create: { userId: user.id, organizationId: org1.id, roleId: adminRole.id },
    });

    // Link to Org 2 as STAFF
    await prisma.userOrganization.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: org2.id } },
        update: {},
        create: { userId: user.id, organizationId: org2.id },
    });
    await prisma.userOrganizationRole.upsert({
        where: { userId_organizationId_roleId: { userId: user.id, organizationId: org2.id, roleId: staffRole.id } },
        update: {},
        create: { userId: user.id, organizationId: org2.id, roleId: staffRole.id },
    });

    console.log('✅ User created and linked to organizations!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Org 1 (Admin): ${org1.name}`);
    console.log(`Org 2 (Staff): ${org2.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
