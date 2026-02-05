import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from apps/api directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@koubou-fes.example.com';
    const user = await prisma.user.update({
        where: { email },
        data: { isSystemAdmin: false },
    });
    console.log(`Updated user ${user.email}: isSystemAdmin = ${user.isSystemAdmin}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
