
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

async function verifyCategoryCreation() {
    try {
        console.log('=== Verifying Category Creation ===');

        // 1. Find a valid Admin User and Organization
        const adminUserLink = await prisma.userOrganization.findFirst({
            where: { role: 'ADMIN' } as any,
            include: { user: true, organization: true }
        });

        if (!adminUserLink) {
            console.error('❌ No Admin user found in DB. Please seed data.');
            return;
        }

        const { user, organization } = adminUserLink;
        console.log(`Using Admin: ${user.name} (${user.email})`);
        console.log(`Organization: ${organization.name} (${organization.id})`);

        // 2. Generate Token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            isSystemAdmin: user.isSystemAdmin
        });

        // Test 1: Create Category (Success)
        console.log('\nTest 1: Create Category (Success)');
        const categoryName = `Test Category ${Date.now()}`;
        const createRes = await axios.post(
            `${API_URL}/organizations/${organization.id}/categories`,
            {
                name: categoryName,
                sortOrder: 10
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (createRes.status === 201 && createRes.data.success) {
            console.log('✅ Category created successfully:', createRes.data.data.name);
        } else {
            console.error('❌ Failed to create category:', createRes.data);
        }

        // Test 2: Create Category (Validation Error)
        console.log('\nTest 2: Create Category (Validation Error - Missing Name)');
        try {
            await axios.post(
                `${API_URL}/organizations/${organization.id}/categories`,
                {
                    sortOrder: 5
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.error('❌ Should have failed with 400');
        } catch (error: any) {
            if (error.response?.status === 400) {
                console.log('✅ Validation error caught correctly (400)');
            } else {
                console.error('❌ Unexpected error:', error.message);
            }
        }

    } catch (error: any) {
        console.error('Verify failed:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyCategoryCreation();
