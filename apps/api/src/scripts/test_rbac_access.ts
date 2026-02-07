
import axios from 'axios';
import 'dotenv/config'; // Load env for JWT_SECRET
import prisma from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';

const API_URL = 'http://localhost:3001/api/v1';

async function main() {
    console.log('--- Testing RBAC API Access ---');

    // 1. Find Valid Organization
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('No organization found');
        return;
    }
    console.log(`Target Org: ${org.name} (${org.id})`);

    // 2. Find Admin User (via ServiceRole)
    // We look for a UserOrganization with roleId pointing to an ADMIN role
    const adminUserOrg = await prisma.userOrganization.findFirst({
        where: {
            organizationId: org.id,
            roles: {
                some: {
                    role: {
                        name: '管理者'
                    }
                }
            }
        },
        include: { user: true }
    });

    const adminToken = adminUserOrg ? generateToken({ userId: adminUserOrg.userId, email: adminUserOrg.user.email }) : null;
    console.log(`Admin User: ${adminUserOrg?.user.email || 'Not Found'}`);

    // 3. Find or Create Staff User (Non-SystemAdmin)
    const staffRole = await prisma.serviceRole.findFirst({
        where: { organizationId: org.id, name: 'スタッフ' }
    });

    if (!staffRole) throw new Error('Staff role not found');

    const staffEmail = 'test-rbac-staff@example.com';
    let staffUser = await prisma.user.findUnique({ where: { email: staffEmail } });
    if (!staffUser) {
        staffUser = await prisma.user.create({
            data: {
                email: staffEmail,
                name: 'Test RBAC Staff',
                passwordHash: 'dummy',
                status: 'ACTIVE',
                isSystemAdmin: false,
                organizations: {
                    create: {
                        organizationId: org.id,
                    }
                }
            }
        });

        // Assign Staff Role via UserOrganizationRole
        await prisma.userOrganizationRole.create({
            data: {
                userId: staffUser.id,
                organizationId: org.id,
                roleId: staffRole.id
            }
        });
        console.log(`Created Test Staff User: ${staffEmail}`);
    } else {
        // Ensure role is correct
        const uo = await prisma.userOrganization.findUnique({
            where: { userId_organizationId: { userId: staffUser.id, organizationId: org.id } }
        });
        const uor = await prisma.userOrganizationRole.findFirst({
            where: { userId: staffUser.id, organizationId: org.id, roleId: staffRole.id }
        });
        if (!uo || !uor) {
            console.log('Updating existing test staff role...');
            await prisma.userOrganization.upsert({
                where: { userId_organizationId: { userId: staffUser.id, organizationId: org.id } },
                update: {},
                create: { userId: staffUser.id, organizationId: org.id }
            });
            await prisma.userOrganizationRole.upsert({
                where: { userId_organizationId_roleId: { userId: staffUser.id, organizationId: org.id, roleId: staffRole.id } },
                update: {},
                create: { userId: staffUser.id, organizationId: org.id, roleId: staffRole.id }
            });
        }
        console.log(`Found Test Staff User: ${staffEmail}`);
    }

    // Ensure isSystemAdmin is false
    if (staffUser.isSystemAdmin) {
        await prisma.user.update({ where: { id: staffUser.id }, data: { isSystemAdmin: false } });
        console.log('Forced isSystemAdmin = false');
    }

    const staffToken = generateToken({ userId: staffUser.id, email: staffUser.email });
    console.log(`Staff User: ${staffEmail} (SystemAdmin: false)`);


    // 4. Test Dashboard Access (Requires 'view', 'Dashboard')
    console.log('\n[Test 1] Admin accessing Dashboard Summary...');
    if (adminToken) {
        try {
            const res = await axios.get(`${API_URL}/organizations/${org.id}/dashboard/summary`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log(`✅ Success: Status ${res.status}`);
        } catch (e: any) {
            console.log(`❌ Failed: ${e.response?.status} ${JSON.stringify(e.response?.data)}`);
        }
    } else {
        console.log('⚠️ Skipping (No Admin)');
    }

    console.log('\n[Test 2] Staff accessing Dashboard Summary...');
    if (staffToken) {
        try {
            await axios.get(`${API_URL}/organizations/${org.id}/dashboard/summary`, {
                headers: { Authorization: `Bearer ${staffToken}` }
            });
            console.log('❌ Unexpected Success (Should have failed)');
        } catch (e: any) {
            if (e.response?.status === 403) {
                console.log(`✅ Correctly Blocked: 403 Forbidden - ${e.response?.data?.error?.message}`);
            } else {
                console.log(`⚠️ Failed with unexpected status: ${e.response?.status}`);
            }
        }
    } else {
        console.log('⚠️ Skipping (No Staff)');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
