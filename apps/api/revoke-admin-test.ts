import prisma from './src/utils/prisma.js';

async function main() {
    const email = 'admin@koubou-fes.example.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isSystemAdmin: true },
        });
        console.log(`Successfully restored admin privilege for ${user.email}. isSystemAdmin: ${user.isSystemAdmin}`);
    } catch (error) {
        console.error('Failed to update user:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
