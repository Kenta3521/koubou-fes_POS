
import axios from 'axios';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { generateToken } from '../utils/jwt';

const API_URL = 'http://localhost:3001/api/v1';

async function main() {
    console.log('=== Category Permission Verification ===');

    // Hardcoded for now based on known seeds or we can create temp users
    // Assuming dev environment has some users. 
    // Better to look up users in DB first.
    const prisma = new PrismaClient();

    try {
        // 1. Find or Create Setup Data
        // Find an organization
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error('No organization found');
        console.log(`Target Organization: ${org.name} (${org.id})`);

        // Find Admin User
        const adminUserLink = await prisma.userOrganization.findFirst({
            where: {
                organizationId: org.id,
                roles: {
                    some: {
                        role: { name: { in: ['管理者', 'ADMIN'] } }
                    }
                }
            },
            include: { user: true }
        });
        if (!adminUserLink) throw new Error('No Admin found for org');
        const adminUser = adminUserLink.user;

        // Find Staff User
        const staffUserLink = await prisma.userOrganization.findFirst({
            where: {
                organizationId: org.id,
                roles: {
                    some: {
                        role: { name: { in: ['スタッフ', 'Staff', 'STAFF'] } }
                    }
                }
            },
            include: { user: true }
        });

        // If no staff, maybe create one? Or just skip if not available, but verification requires it.
        // For now let's assume one exists or we just rely on Admin and Non-member.

        // Non-member (just a user not in this org)
        // Find a user NOT in this org
        const allUsers = await prisma.user.findMany({ include: { organizations: true } });
        const nonMember = allUsers.find(u => !u.organizations.some(mo => mo.organizationId === org.id));

        // 2. Generate Tokens (Simulate Login)
        const { generateToken } = await import('../utils/jwt');

        const adminToken = generateToken({
            userId: adminUser.id,
            email: adminUser.email,
            role: 'ADMIN',
            organizationId: org.id
        });

        const staffToken = staffUserLink ? generateToken({
            userId: (staffUserLink as any).user.id,
            email: (staffUserLink as any).user.email,
            role: 'STAFF',
            organizationId: org.id
        }) : null;

        const nonMemberToken = nonMember ? generateToken({
            userId: nonMember.id,
            email: nonMember.email,
            role: 'STAFF',
            organizationId: 'other-org-id'
        }) : null;

        console.log('Tokens generated.');

        // 3. Test Cases

        // Case A: Admin Create Category (Should Success)
        console.log('\n[Case 1] Admin Create Category...');
        try {
            const res = await axios.post(`${API_URL}/organizations/${org.id}/categories`, {
                name: 'Verify_Admin_Cat'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✅ Success:', res.status, res.data.data.name);
            // Cleanup
            await axios.delete(`${API_URL}/organizations/${org.id}/categories/${res.data.data.id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
        } catch (e: any) {
            console.error('❌ Failed:', e.response?.status, e.response?.data);
        }

        // Case B: Staff Create Category (Should Fail 403)
        if (staffToken) {
            console.log('\n[Case 2] Staff Create Category...');
            try {
                await axios.post(`${API_URL}/organizations/${org.id}/categories`, {
                    name: 'Verify_Staff_Cat'
                }, {
                    headers: { Authorization: `Bearer ${staffToken}` }
                });
                console.error('❌ Unexpected Success (Should fail)');
            } catch (e: any) {
                if (e.response?.status === 403) {
                    console.log('✅ Correctly Forbidden (403)');
                } else {
                    console.error('❌ Wrong Error:', e.response?.status, e.response?.data);
                }
            }
        } else {
            console.log('[Case 2] Skipped (No staff user found)');
        }

        // Case C: Non-Member Access (Should Fail 403)
        if (nonMemberToken) {
            console.log('\n[Case 3] Non-Member Access...');
            try {
                await axios.get(`${API_URL}/organizations/${org.id}/categories`, {
                    headers: { Authorization: `Bearer ${nonMemberToken}` }
                });
                console.error('❌ Unexpected Success (Should fail)');
            } catch (e: any) {
                if (e.response?.status === 403) {
                    console.log('✅ Correctly Forbidden (403): Not a member');
                } else {
                    console.error('❌ Wrong Error:', e.response?.status, e.response?.data);
                }
            }
        } else {
            console.log('[Case 3] Skipped (No non-member user found)');
        }

    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
