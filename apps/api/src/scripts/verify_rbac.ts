
import prisma from '../utils/prisma.js';

async function main() {
    console.log('--- Verifying RBAC Data ---');

    console.log('\n1. Checking Permissions (top 5)');
    const perms = await prisma.permission.findMany({ take: 5 });
    console.table(perms.map(p => ({ code: p.code, cat: p.category })));

    console.log('\n2. Checking Roles for an Organization');
    const org = await prisma.organization.findFirst();
    if (org) {
        console.log(`Organization ID: ${org.id}`);
        const roles = await prisma.serviceRole.findMany({
            where: { organizationId: org.id },
            include: { permissions: { include: { permission: true } } }
        });

        for (const role of roles) {
            console.log(`\nRole[${role.name}] SystemRole? ${role.isSystemRole}`);
            console.log(`- Permissions: ${role.permissions.length}`);
            console.log(`- Codes: ${role.permissions.map(rp => rp.permission.code).join(', ')}`);
        }

        console.log('\n3. Checking UserOrganization Role IDs');
        const members = await prisma.userOrganization.findMany({
            where: { organizationId: org.id },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        console.table(members.map(m => ({
            userId: m.userId.substring(0, 8) + '...',
            roles: m.roles.map(ur => ur.role.name).join(', '),
        })));

    } else {
        console.log('No organization found.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
