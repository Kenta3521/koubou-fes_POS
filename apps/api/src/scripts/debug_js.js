import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Debugging Dashboard Data (JS) ---');
  try {
    const orgs = await prisma.organization.findMany();
    console.log(`Found ${orgs.length} organizations.`);

    for (const org of orgs) {
      console.log(`\nOrganization: ${org.name} (${org.id})`);
      const count = await prisma.transaction.count({
        where: { organizationId: org.id }
      });
      console.log(`  Total Transactions: ${count}`);
      
      const adminUsers = await prisma.userOrganization.findMany({
          where: { organizationId: org.id, role: 'ADMIN' },
          include: { user: true }
      });
      console.log(`  Admins: ${adminUsers.map(u => u.user.name).join(', ')}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
