
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log('Latest 5 Transactions:');
    transactions.forEach(t => {
        console.log('---');
        console.log(`ID: ${t.id}`);
        console.log(`Status: ${t.status}`);
        console.log(`paypayOrderId: ${t.paypayOrderId}`);
        console.log(`paypayCodeId: ${t.paypayCodeId}`);
        console.log(`CreatedAt: ${t.createdAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
