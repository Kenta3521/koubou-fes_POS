import prisma from '../utils/prisma.js';

async function main() {
    try {
        const org = await prisma.organization.findFirst({ select: { id: true, name: true } });
        if (!org) {
            console.log(JSON.stringify({ error: 'No organization found' }));
            return;
        }
        const role = await prisma.serviceRole.findFirst({
            where: { organizationId: org.id },
            select: { id: true, name: true }
        });
        console.log(JSON.stringify({ org, role }));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
