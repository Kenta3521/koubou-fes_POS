
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

async function verifyCategoryUpdate() {
    try {
        console.log('=== Verifying Category Update ===');

        // 1. Setup: Admin User and Organization
        const adminUserLink = await prisma.userOrganization.findFirst({
            where: { role: 'ADMIN' },
            include: { user: true, organization: true }
        });

        if (!adminUserLink) {
            console.error('❌ No Admin user found in DB. Please seed data.');
            return;
        }

        const { user, organization } = adminUserLink;
        const orgId = organization.id;
        console.log(`Using Admin: ${user.name}`);
        console.log(`Organization: ${organization.name}`);

        const token = generateToken({
            userId: user.id,
            email: user.email,
            isSystemAdmin: user.isSystemAdmin
        });

        // 2. Setup: Create a temporary category to update
        const tempCategory = await prisma.category.create({
            data: {
                organizationId: orgId,
                name: `Update Test ${Date.now()}`,
                sortOrder: 1
            }
        });
        const categoryId = tempCategory.id;
        console.log(`Created temp category: ${tempCategory.name} (${categoryId})`);

        // Test 1: Update Name (Success)
        console.log('\nTest 1: Update Name (Success)');
        const newName = `Updated ${Date.now()}`;
        const updateRes1 = await axios.patch(
            `${API_URL}/organizations/${orgId}/categories/${categoryId}`,
            { name: newName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (updateRes1.data.success && updateRes1.data.data.name === newName) {
            console.log('✅ Name updated successfully');
        } else {
            console.error('❌ Failed to update name:', updateRes1.data);
        }

        // Test 2: Update SortOrder (Success)
        console.log('\nTest 2: Update SortOrder (Success)');
        const newOrder = 99;
        const updateRes2 = await axios.patch(
            `${API_URL}/organizations/${orgId}/categories/${categoryId}`,
            { sortOrder: newOrder },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (updateRes2.data.success && updateRes2.data.data.sortOrder === newOrder) {
            console.log('✅ SortOrder updated successfully');
        } else {
            console.error('❌ Failed to update sortOrder:', updateRes2.data);
        }

        // Test 3: Unauthorized Access (Fail)
        console.log('\nTest 3: Unauthorized Access');
        // Find a user who is NOT admin of this org (if possible) or generate random token
        // Let's manually create a token for a fake user
        const fakeToken = generateToken({ userId: 'fake-user-id', email: 'fake@example.com' });
        try {
            await axios.patch(
                `${API_URL}/organizations/${orgId}/categories/${categoryId}`,
                { name: 'Hacked' },
                { headers: { Authorization: `Bearer ${fakeToken}` } }
            );
            console.error('❌ Should have failed with 403 (or 404 if org not found for user)');
        } catch (error: any) {
            if (error.response?.status === 403 || error.response?.status === 404) { // 403 Forbidden or 403 Access Denied logic
                console.log(`✅ correctly rejected with ${error.response.status}`);
            } else {
                console.error('❌ Unexpected error:', error.message);
            }
        }

        // Cleanup
        await prisma.category.delete({ where: { id: categoryId } });
        console.log('\nCleanup: Deleted temp category');

    } catch (error: any) {
        console.error('Verify failed details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
    }
}

verifyCategoryUpdate();
