
import axios from 'axios';
import prisma, { closePrisma } from '../utils/prisma.js';

const API_URL = 'http://localhost:3001/api/v1';
const EMAIL = 'admin@koubou-fes.example.com';
const PASSWORD = 'password123'; // Defined in test_accounts.md

async function main() {
    console.log('--- Testing Dashboard Access ---');

    // 1. Get Organization ID
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('No organization found');
        return;
    }
    console.log(`Target Organization: ${org.name} (${org.id})`);

    try {
        // 2. Login
        console.log(`Logging in as ${EMAIL}...`);
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        if (!loginRes.data.success) {
            console.error('Login failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.data.token;
        console.log('Login successful, got token.');

        // 3. Fetch Dashboard Summary
        console.log('Fetching dashboard summary...');
        try {
            const dashboardRes = await axios.get(`${API_URL}/organizations/${org.id}/dashboard/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Dashboard Data:', JSON.stringify(dashboardRes.data, null, 2));

            // 4. Fetch Other Dashboard Endpoints
            const endpoints = ['trends', 'category-sales', 'inventory', 'health'];
            for (const endpoint of endpoints) {
                console.log(`Fetching dashboard ${endpoint}...`);
                const res = await axios.get(`${API_URL}/organizations/${org.id}/dashboard/${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`${endpoint} Data:`, JSON.stringify(res.data, null, 2));
            }

        } catch (e: any) {
            console.error('Dashboard fetch failed:');
            if (e.response) {
                console.error(`Status: ${e.response.status}`);
                console.error('Data:', JSON.stringify(e.response.data, null, 2));
            } else {
                console.error(e.message);
            }
        }

    } catch (error: any) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    } finally {
        await closePrisma();
    }
}

main();
