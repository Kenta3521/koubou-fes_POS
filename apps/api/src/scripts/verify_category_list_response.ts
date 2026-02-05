
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

async function verifyCategoryListResponse() {
    console.log('=== Verifying Category List Response ===');
    try {
        const organization = await prisma.organization.findFirst();
        if (!organization) throw new Error('No organization found');
        const orgId = organization.id;

        const adminLink = await prisma.userOrganization.findFirst({
            where: { organizationId: orgId, role: 'ADMIN' },
            include: { user: true }
        });
        if (!adminLink) throw new Error('No Admin found');
        const adminUser = adminLink.user;

        const token = generateToken({ userId: adminUser.id, email: adminUser.email, isSystemAdmin: adminUser.isSystemAdmin });

        // Ensure at least one category exists
        const count = await prisma.category.count({ where: { organizationId: orgId } });
        if (count === 0) {
            await prisma.category.create({ data: { organizationId: orgId, name: 'Test Cat' } });
        }

        const res = await axios.get(
            `${API_URL}/organizations/${orgId}/categories`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('Response Status:', res.status);
        if (res.data.success && res.data.data.length > 0) {
            const firstCat = res.data.data[0];
            console.log('First Category Structure:', JSON.stringify(firstCat, null, 2));
            if (firstCat._count && typeof firstCat._count.products === 'number') {
                console.log('✅ _count.products is present and is a number:', firstCat._count.products);
            } else {
                console.error('❌ _count.products is MISSING or invalid');
            }
        } else {
            console.log('No categories found or success=false');
        }

    } catch (error: any) {
        console.error('Script Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
    } finally {
        await prisma.$disconnect();
    }
}

verifyCategoryListResponse();
