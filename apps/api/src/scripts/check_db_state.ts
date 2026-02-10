
import prisma from '../utils/prisma.js';

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log('--- Organizations ---');
    console.log(JSON.stringify(orgs, null, 2));

    const users = await prisma.user.count();
    const products = await prisma.product.count();
    const trans = await prisma.transaction.count();

    console.log('\n--- Counts ---');
    console.log({ users, products, trans });
}

main().catch(console.error).finally(() => prisma.$disconnect());
