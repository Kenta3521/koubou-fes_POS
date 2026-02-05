import { Role } from '@prisma/client';
import { joinOrganization } from '../services/userService';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

async function main() {
    console.log('Starting TMP Role Verification...');

    // 1. Setup: Get a valid invite code from an existing organization
    const org = await prisma.organization.findFirst({
        where: { isActive: true }
    });

    if (!org) {
        console.error('No active organization found to test with.');
        process.exit(1);
    }
    console.log(`Using organization: ${org.name} (${org.inviteCode})`);

    // 2. Create a test user
    const email = `tmptest_${Date.now()}@example.com`;
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            name: 'TMP Tester',
            passwordHash,
            status: 'ACTIVE'
        }
    });
    console.log(`Created test user: ${user.email} (${user.id})`);

    try {
        // 3. Join Organization
        console.log('Joining organization...');
        const joinResult = await joinOrganization(user.id, org.inviteCode);

        console.log('Join result:', joinResult);

        // 4. Verify Role is TMP
        if (joinResult.role !== 'TMP') {
            console.error(`FAILED: Expected role TMP, got ${joinResult.role}`);
            process.exit(1);
        } else {
            console.log('PASSED: Role is TMP');
        }

        // 5. Verify Database State
        const membership = await prisma.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: user.id,
                    organizationId: org.id
                }
            }
        });

        if (membership?.role !== 'TMP') {
            console.error(`FAILED: DB role verification failed. Expected TMP, got ${membership?.role}`);
            process.exit(1);
        }
        console.log('PASSED: DB role verified as TMP');

        // 6. Simulate Access Check (Manual check logic similar to middleware)
        // requireOrgRole uses allowedRoles.includes(membership.role)
        const allowedRoles = [Role.ADMIN, Role.STAFF];
        const hasAccess = allowedRoles.includes(membership.role);

        if (hasAccess) {
            console.error('FAILED: TMP user should NOT have access (simulated check)');
            process.exit(1);
        } else {
            console.log('PASSED: TMP user correctly denied access (simulated check)');
        }

        // 7. Clean up
        await prisma.userOrganization.deleteMany({
            where: { userId: user.id }
        });
        await prisma.user.delete({ where: { id: user.id } });
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Verification failed with error:', error);
        // Try cleanup
        try {
            await prisma.userOrganization.deleteMany({
                where: { userId: user.id }
            });
            await prisma.user.delete({ where: { id: user.id } });
        } catch { }
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
