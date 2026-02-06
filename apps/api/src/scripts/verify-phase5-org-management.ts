import axios from 'axios';
import prisma from '../utils/prisma.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function main() {
    console.log('🚀 Starting Phase 5 Organization Management Verification');

    // 1. Get or Create System Admin
    let admin = await prisma.user.findFirst({
        where: { isSystemAdmin: true }
    });

    if (!admin) {
        console.log('⚠️ No system admin found. Creating one...');
        admin = await prisma.user.create({
            data: {
                email: `admin-${Date.now()}@test.com`,
                name: 'Test System Admin',
                passwordHash: 'hashed-password-placeholder', // We don't need real login for this test, just ID for token
                isSystemAdmin: true,
            }
        });
    }

    console.log(`👤 Using System Admin: ${admin.id} (${admin.name})`);

    // 2. Generate Token
    const token = jwt.sign(
        { userId: admin.id, email: admin.email, isSystemAdmin: true },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const client = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` }
    });

    try {
        // 3. Test Create Organization (P5-008)
        console.log('\n--- Testing Create Organization (P5-008) ---');
        const orgName = `Test Org ${Date.now()}`;
        const createRes = await client.post('/organizations', {
            name: orgName
        });
        const newOrg = createRes.data.data;
        console.log('✅ Organization Created:', newOrg.id, newOrg.name, newOrg.inviteCode);

        // 4. Test Organization List (P5-007)
        console.log('\n--- Testing Organization List (P5-007) ---');
        const listRes = await client.get('/admin/organizations/list');
        const orgs = listRes.data.data;
        const found = orgs.find((o: any) => o.id === newOrg.id);
        if (found) {
            console.log('✅ New organization found in list:', found.name);
        } else {
            console.error('❌ New organization NOT found in list');
        }

        // 5. Test Update Organization (P5-009)
        console.log('\n--- Testing Update Organization (P5-009) ---');
        const updatedName = `${orgName} (Updated)`;
        const updateRes = await client.patch(`/organizations/${newOrg.id}`, {
            name: updatedName,
            isActive: false // Temporarily disable
        });
        const updatedOrg = updateRes.data.data;
        console.log('✅ Organization Updated:', updatedOrg.name, 'IsActive:', updatedOrg.isActive);

        if (updatedOrg.name === updatedName && updatedOrg.isActive === false) {
            console.log('   -> Update verified');
        } else {
            console.error('   -> Update mismatch');
        }

        // 6. Test Regenerate Invite Code (P5-010)
        console.log('\n--- Testing Regenerate Invite Code (P5-010) ---');
        const oldInviteCode = newOrg.inviteCode;
        const regenRes = await client.post(`/organizations/${newOrg.id}/regenerate-invite`);
        const newInviteCode = regenRes.data.data.newInviteCode;
        console.log('✅ Old Code:', oldInviteCode, '-> New Code:', newInviteCode);

        if (oldInviteCode !== newInviteCode) {
            console.log('   -> Regeneration verified');
        } else {
            console.error('   -> Code did not change');
        }

        // Clean up (optional)
        // await prisma.organization.delete({ where: { id: newOrg.id } }); // Maybe keep it for manual check if needed

        console.log('\n🎉 Verification Completed Successfully!');

        // --- Negative Testing ---
        console.log('\n--- Negative Testing ---');

        // 7. Non-Admin Access
        console.log('Testing Non-Admin Access...');
        let staff = await prisma.user.findFirst({ where: { isSystemAdmin: false } });
        if (!staff) {
            staff = await prisma.user.create({
                data: {
                    email: `staff-${Date.now()}@test.com`,
                    name: 'Test Staff',
                    passwordHash: 'hashed-password-placeholder',
                    isSystemAdmin: false,
                }
            });
        }
        const staffToken = jwt.sign(
            { userId: staff.id, email: staff.email, isSystemAdmin: false },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        const staffClient = axios.create({
            baseURL: API_URL,
            headers: { Authorization: `Bearer ${staffToken}` }
        });

        try {
            await staffClient.post('/organizations', { name: 'Fail Org' });
            console.error('❌ Non-admin was able to create organization (Should be 403)');
        } catch (err: any) {
            if (err.response?.status === 403) {
                console.log('✅ Non-admin create rejected (403)');
            } else {
                console.error(`❌ Unexpected status for non-admin: ${err.response?.status}`);
            }
        }

        // 8. Invalid Input (Empty Name)
        console.log('Testing Invalid Input...');
        try {
            await client.post('/organizations', { name: '' });
            console.error('❌ Created organization with empty name (Should be 400)');
        } catch (err: any) {
            if (err.response?.status === 400) {
                console.log('✅ Empty name rejected (400)');
            } else {
                console.error(`❌ Unexpected status for invalid input: ${err.response?.status}`);
            }
        }

        // 9. Non-existent Organization
        console.log('Testing Non-existent Organization...');
        try {
            await client.patch('/organizations/non-existent-id-123', { name: 'New Name' });
            console.error('❌ Updated non-existent organization (Should be 404)');
        } catch (err: any) {
            if (err.response?.status === 404) {
                console.log('✅ Non-existent update rejected (404)');
            } else {
                console.error(`❌ Unexpected status for non-existent: ${err.response?.status}`, err.response?.data);
            }
        }

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.response?.data || error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
