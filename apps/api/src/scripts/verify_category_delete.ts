
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

async function verifyCategoryDelete() {
    console.log('=== Verifying Category Delete ===');
    let orgId: string | null = null;
    let safeCatId: string | null = null;
    let unsafeCatId: string | null = null;
    let productId: string | null = null;

    try {
        // 1. Setup Data
        const organization = await prisma.organization.findFirst();
        if (!organization) throw new Error('No organization found');
        orgId = organization.id;

        const adminLink = await prisma.userOrganization.findFirst({
            where: { organizationId: orgId, role: 'ADMIN' },
            include: { user: true }
        });
        if (!adminLink) throw new Error('No Admin found');
        const adminUser = adminLink.user;

        console.log(`Using Admin: ${adminUser.name}`);
        const token = generateToken({ userId: adminUser.id, email: adminUser.email, isSystemAdmin: adminUser.isSystemAdmin });

        // Create Safe Category (No products)
        const safeCat = await prisma.category.create({
            data: { organizationId: orgId, name: 'Safe to Delete', sortOrder: 900 }
        });
        safeCatId = safeCat.id;

        // Create Unsafe Category (With products)
        const unsafeCat = await prisma.category.create({
            data: { organizationId: orgId, name: 'Unsafe to Delete', sortOrder: 901 }
        });
        unsafeCatId = unsafeCat.id;

        // Create Product linked to Unsafe Cat
        const product = await prisma.product.create({
            data: {
                organizationId: orgId,
                categoryId: unsafeCatId,
                name: 'Linked Product',
                price: 100
            }
        });
        productId = product.id;

        console.log('Setup completed.');

        // Test 1: Delete Category with Products (Should Fail - 400)
        console.log('\n[Test 1] Delete Category WITH Products (Expect: 400 Bad Request)');
        try {
            await axios.delete(
                `${API_URL}/organizations/${orgId}/categories/${unsafeCatId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.error('❌ Unexpected Success (Should fail)');
        } catch (error: any) {
            if (error.response?.status === 400 && error.response.data.error.code === 'CATEGORY_HAS_PRODUCTS') {
                console.log('✅ Correctly Rejected: 400 CATEGORY_HAS_PRODUCTS');
            } else {
                console.error(`❌ Unexpected Error: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
            }
        }

        // Test 2: Delete Category WITHOUT Products (Should Success - 204)
        console.log('\n[Test 2] Delete Category WITHOUT Products (Expect: 204 No Content)');
        try {
            const res = await axios.delete(
                `${API_URL}/organizations/${orgId}/categories/${safeCatId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.status === 204) {
                console.log('✅ Success: 204 No Content');
            } else {
                console.error(`❌ Unexpected Status: ${res.status}`);
            }
        } catch (error: any) {
            console.error(`❌ Unexpected Failure: ${error.response?.status} ${JSON.stringify(error.response?.data)}`);
        }

        // Verify Deletion in DB
        const deletedCat = await prisma.category.findUnique({ where: { id: safeCatId } });
        if (!deletedCat) {
            console.log('✅ Database Verification: Category verified deleted');
        } else {
            console.error('❌ Database Verification: Category still exists!');
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        // Cleanup
        if (productId) await prisma.product.delete({ where: { id: productId } }).catch(() => { });
        if (unsafeCatId) await prisma.category.delete({ where: { id: unsafeCatId } }).catch(() => { });
        // safeCatId is expected to be deleted
        await prisma.$disconnect();
    }
}

verifyCategoryDelete();
