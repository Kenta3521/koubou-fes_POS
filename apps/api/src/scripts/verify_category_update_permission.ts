
import axios from 'axios';
import prisma from '../utils/prisma.js';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:3001/api/v1';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(payload: any): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    } as any);
}

async function verifyCategoryUpdatePermissions() {
    console.log('=== Verifying Category Update Permissions ===');
    let tempCategoryId: string | null = null;
    let orgId: string | null = null;

    try {
        // 1. Setup Data
        // Find an organization
        const organization = await prisma.organization.findFirst();
        if (!organization) throw new Error('No organization found');
        orgId = organization.id;
        console.log(`Target Organization: ${organization.name} (${orgId})`);

        // Find ADMIN
        const adminLink = await prisma.userOrganization.findFirst({
            where: { organizationId: orgId, role: 'ADMIN' },
            include: { user: true }
        });
        const adminUser = adminLink?.user;
        if (!adminUser) throw new Error('No Admin found');

        // Find STAFF (or create temp)
        let staffLink = await prisma.userOrganization.findFirst({
            where: { organizationId: orgId, role: 'STAFF' },
            include: { user: true }
        });

        let staffUser = staffLink?.user;
        let createdStaff = false;

        if (!staffUser) {
            console.log('Creating temp staff user...');
            staffUser = await prisma.user.create({
                data: {
                    email: `temp-staff-${Date.now()}@example.com`,
                    name: 'Temp Staff',
                    passwordHash: 'dummy',
                    organizations: {
                        create: {
                            organizationId: orgId,
                            role: 'STAFF'
                        }
                    }
                }
            });
            createdStaff = true;
        }

        // Find Non-member (or create temp)
        // Check for a user who does not have a UserOrganization link to this org
        const nonMembers = await prisma.user.findMany({
            where: {
                NOT: {
                    organizations: {
                        some: {
                            organizationId: orgId
                        }
                    }
                }
            },
            take: 1
        });

        let nonMemberUser = nonMembers[0];
        let createdNonMember = false;

        if (!nonMemberUser) {
            console.log('Creating temp non-member user...');
            nonMemberUser = await prisma.user.create({
                data: {
                    email: `temp-outsider-${Date.now()}@example.com`,
                    name: 'Temp Outsider',
                    passwordHash: 'dummy'
                }
            });
            createdNonMember = true;
        }

        console.log(`users prepared:
  ADMIN: ${adminUser.name}
  STAFF: ${staffUser.name}
  OUTSIDER: ${nonMemberUser.name}
`);

        // Create Temp Category for testing
        const cat = await prisma.category.create({
            data: { organizationId: orgId, name: 'Permission Test Cat', sortOrder: 999 }
        });
        tempCategoryId = cat.id;

        // Generate Tokens
        const adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, isSystemAdmin: adminUser.isSystemAdmin });
        const staffToken = generateToken({ userId: staffUser.id, email: staffUser.email, isSystemAdmin: staffUser.isSystemAdmin });
        const outsiderToken = generateToken({ userId: nonMemberUser.id, email: nonMemberUser.email, isSystemAdmin: nonMemberUser.isSystemAdmin });

        // --- Test Cases ---

        // Case 1: ADMIN (Should Success)
        console.log('\n[Case 1] ADMIN User Update (Expect: 200 OK)');
        try {
            const res = await axios.patch(
                `${API_URL}/organizations/${orgId}/categories/${tempCategoryId}`,
                { name: 'Updated by Admin' },
                { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            console.log(`✅ Success: ${res.status} ${res.statusText}`);
        } catch (error: any) {
            console.error(`❌ Unexpected Failure: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
        }

        // Case 2: STAFF (Should Fail - 403)
        console.log('\n[Case 2] STAFF User Update (Expect: 403 Forbidden)');
        try {
            await axios.patch(
                `${API_URL}/organizations/${orgId}/categories/${tempCategoryId}`,
                { name: 'Updated by Staff' },
                { headers: { Authorization: `Bearer ${staffToken}` } }
            );
            console.error('❌ Unexpected Success (Should fail)');
        } catch (error: any) {
            if (error.response?.status === 403) {
                console.log('✅ Correctly Forbidden: 403');
                console.log(`   Message: ${error.response.data.error.message}`);
            } else {
                console.error(`❌ Wrong Status: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
            }
        }

        // Case 3: OUTSIDER (Should Fail - 403)
        console.log('\n[Case 3] NON-MEMBER User Update (Expect: 403 Forbidden)');
        try {
            await axios.patch(
                `${API_URL}/organizations/${orgId}/categories/${tempCategoryId}`,
                { name: 'Updated by Outsider' },
                { headers: { Authorization: `Bearer ${outsiderToken}` } }
            );
            console.error('❌ Unexpected Success (Should fail)');
        } catch (error: any) {
            if (error.response?.status === 403) {
                console.log('✅ Correctly Forbidden: 403');
                console.log(`   Message: ${error.response.data.error.message}`);
            } else {
                console.error(`❌ Wrong Status: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
            }
        }

        // Cleanup
        if (createdStaff) await prisma.user.delete({ where: { id: staffUser.id } });
        if (createdNonMember) await prisma.user.delete({ where: { id: nonMemberUser.id } });

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        if (tempCategoryId) {
            await prisma.category.delete({ where: { id: tempCategoryId } }).catch(() => { });
        }
        await prisma.$disconnect();
    }
}

verifyCategoryUpdatePermissions();
