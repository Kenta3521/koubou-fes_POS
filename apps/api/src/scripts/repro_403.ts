import axios from 'axios';

async function reproduce() {
    const API_URL = 'http://localhost:3001/api/v1';

    try {
        console.log('--- Reproducing 403 Issues ---');

        // 1. Login as Leader
        console.log('Logging in as leader@yakisoba.example.com...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'leader@yakisoba.example.com',
            password: 'password123'
        });

        const token = loginRes.data.data.token;
        const user = loginRes.data.data.user;
        const orgId = user.organizations[0].id;

        console.log(`Log in success. OrgId: ${orgId}`);
        console.log(`User Permissions: ${user.organizations[0].permissions.join(', ')}`);

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test Dashboard (Should work)
        console.log('Testing GET /dashboard/summary...');
        try {
            const res = await axios.get(`${API_URL}/organizations/${orgId}/dashboard/summary`, { headers });
            console.log(`Dashboard OK: ${res.status}`);
        } catch (e: any) {
            console.error(`Dashboard FAILED: ${e.response?.status} - ${JSON.stringify(e.response?.data?.error)}`);
        }

        // 3. Test Organization Details ( Suspected FAILED )
        console.log('Testing GET /organizations/:orgId...');
        try {
            const res = await axios.get(`${API_URL}/organizations/${orgId}`, { headers });
            console.log(`Organization Details OK: ${res.status}`);
        } catch (e: any) {
            console.error(`Organization Details FAILED: ${e.response?.status} - ${JSON.stringify(e.response?.data?.error)}`);
        }

        // 4. Test Product List ( checkPermission )
        console.log('Testing GET /organizations/:orgId/products...');
        try {
            const res = await axios.get(`${API_URL}/organizations/${orgId}/products`, { headers });
            console.log(`Product List OK: ${res.status}`);
        } catch (e: any) {
            console.error(`Product List FAILED: ${e.response?.status} - ${JSON.stringify(e.response?.data?.error)}`);
        }

        // 5. Test Member List ( checkPermission )
        console.log('Testing GET /organizations/:orgId/members...');
        try {
            const res = await axios.get(`${API_URL}/organizations/${orgId}/members`, { headers });
            console.log(`Member List OK: ${res.status}`);
        } catch (e: any) {
            console.error(`Member List FAILED: ${e.response?.status} - ${JSON.stringify(e.response?.data?.error)}`);
        }

    } catch (error: any) {
        console.error('Login or setup failed:', error.response?.data || error.message);
    }
}

reproduce();
