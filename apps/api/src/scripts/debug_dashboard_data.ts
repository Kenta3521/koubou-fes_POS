import prisma, { closePrisma } from '../utils/prisma.js';

// Enums from Prisma schema or strings
const TransactionStatus = {
  COMPLETED: 'COMPLETED'
};

async function main() {
  console.log('--- Debugging Dashboard Data ---');

  // 1. Get all organizations
  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations.`);

  for (const org of orgs) {
    console.log(`\nOrganization: ${org.name} (${org.id})`);

    // 2. Count completed transactions
    const txCount = await prisma.transaction.count({
      where: {
        organizationId: org.id,
        status: TransactionStatus.COMPLETED as any,
      }
    });
    console.log(`  Completed Transactions: ${txCount}`);

    // 3. Sum total amount
    const txSum = await prisma.transaction.aggregate({
      where: {
        organizationId: org.id,
        status: TransactionStatus.COMPLETED as any,
      },
      _sum: { totalAmount: true }
    });
    console.log(`  Total Sales: ${txSum._sum.totalAmount}`);

    // 4. Check for recent transactions (last 24 hours)
    const recentTx = await prisma.transaction.findMany({
      where: {
        organizationId: org.id,
        status: TransactionStatus.COMPLETED as any,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      take: 3
    });
    console.log(`  Recent Transactions (last 24h): ${recentTx.length}`);

    // 5. List members and roles
    const members = await prisma.userOrganization.findMany({
      where: { organizationId: org.id },
      include: { user: true }
    });
    console.log(`  Members:`);
    members.forEach(m => {
      console.log(`    - ${m.user.name} (${m.user.email}): ${m.role} [isSystemAdmin: ${m.user.isSystemAdmin}]`);
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await closePrisma();
  });
