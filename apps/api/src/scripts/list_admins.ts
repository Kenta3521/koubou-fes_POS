import 'dotenv/config';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function listAdmins() {
    const admins = await prisma.user.findMany({
        where: { isSystemAdmin: true },
        select: { id: true, email: true, name: true }
    });
    console.log('👑 System Administrators:');
    console.table(admins);
    await prisma.$disconnect();
}

listAdmins().catch(console.error);
