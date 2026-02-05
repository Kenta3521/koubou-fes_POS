
import axios from 'axios';
import prisma from '../utils/prisma.js';
const API_URL = 'http://localhost:3001/api/v1';

// Test Credentials from seed.ts
const ADMIN_EMAIL = 'leader@yakisoba.example.com';
const ADMIN_PASSWORD = 'password123';

async function login(email, password) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        return response.data.data.token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        throw error;
    }
}

async function runTest() {
    try {
        console.log('--- Product CRUD Verification ---');

        // 1. Setup: Get Org ID for the user
        console.log('1. Setting up...');
        const user = await prisma.user.findUnique({
            where: { email: ADMIN_EMAIL },
            include: { organizations: true }
        });

        if (!user || user.organizations.length === 0) {
            throw new Error(`User ${ADMIN_EMAIL} not found or has no organizations`);
        }

        const ORG_ID = user.organizations[0].organizationId;
        console.log(`Target Organization ID: ${ORG_ID}`);

        // 2. Login
        console.log('\n2. Logging in...');
        const token = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
        const headers = { Authorization: `Bearer ${token}` };
        console.log('Login successful');

        // 3. Create Product (Success)
        console.log('\n3. Creating Product (Success)...');
        const newProductData = {
            name: `検証用焼きそば ${Date.now()}`,
            price: 500,
            stock: 100,
            isActive: true
        };
        const createRes = await axios.post(`${API_URL}/organizations/${ORG_ID}/products`, newProductData, { headers });
        console.log('Create Response:', createRes.data);
        const productId = createRes.data.data.id;

        if (!productId) throw new Error('Product creation failed: No ID returned');

        // 4. Get Product List (Should include new product)
        console.log('\n4. Verifying Product in List...');
        const listRes = await axios.get(`${API_URL}/organizations/${ORG_ID}/products`, { headers });
        const found = listRes.data.data.find(p => p.id === productId);
        if (found) {
            console.log('✅ Product found in list');
        } else {
            console.error('❌ Product NOT found in list');
        }

        // 5. Update Product
        console.log('\n5. Updating Product...');
        const updateData = { name: `検証用焼きそば（大盛） ${Date.now()}`, price: 600 };
        const updateRes = await axios.patch(`${API_URL}/organizations/${ORG_ID}/products/${productId}`, updateData, { headers });
        console.log('Update Response:', updateRes.data);
        if (updateRes.data.data.name === updateData.name && updateRes.data.data.price === updateData.price) {
            console.log('✅ Product updated successfully');
        } else {
            console.error('❌ Product update verification failed');
        }

        // 6. Delete Product (Logical Delete)
        console.log('\n6. Deleting Product (Logical)...');
        await axios.delete(`${API_URL}/organizations/${ORG_ID}/products/${productId}`, { headers });
        console.log('✅ Delete request successful');

        // 7. Verify Deletion (Should NOT be in list)
        console.log('\n7. Verifying Logical Deletion in List...');
        const listAfterDeleteRes = await axios.get(`${API_URL}/organizations/${ORG_ID}/products`, { headers });
        const foundAfterDelete = listAfterDeleteRes.data.data.find(p => p.id === productId);
        if (!foundAfterDelete) {
            console.log('✅ Product successfully removed from list (Logical Delete confirmed)');
        } else {
            console.error('❌ Product STILL found in list after deletion');
        }

        // 8. Verify Get Single (Should likely fail or return 404/null)
        console.log('\n8. Verifying Get Single after deletion...');
        try {
            await axios.get(`${API_URL}/organizations/${ORG_ID}/products/${productId}`, { headers });
            console.error('❌ Get Single succeeded but should have failed (404)');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Get Single returned 404 as expected');
            } else {
                console.error('❌ Unexpected error code:', error.response?.status);
            }
        }

        console.log('\n--- Verification Completed ---');

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
