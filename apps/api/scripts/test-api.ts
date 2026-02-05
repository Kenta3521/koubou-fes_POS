import 'dotenv/config';

async function main() {
    const baseUrl = 'http://localhost:3001/api/v1';

    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff@yakisoba.example.com', password: 'password123' })
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    }

    const data = (await loginRes.json()) as any;
    console.log('Login Response:', data);
    const { token, user } = data.data;
    if (!token) throw new Error('No token');
    console.log('Login success. Token:', token.substring(0, 10) + '...');
    const orgId = user.organizations[0].id;
    console.log('Org ID:', orgId);

    // 2. Get Products (to get IDs)
    const productsRes = await fetch(`${baseUrl}/organizations/${orgId}/products`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const productsData = (await productsRes.json()) as any;
    console.log('Products Response:', JSON.stringify(productsData));
    const products = productsData.data || [];
    const yakisoba = products.find((p: any) => p.name.includes('焼きそば'));

    if (!yakisoba) throw new Error('Yakisoba not found');

    // 3. Calculate
    console.log('Calling /calculate...');
    const calcRes = await fetch(`${baseUrl}/organizations/${orgId}/transactions/calculate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            items: [{ productId: yakisoba.id, quantity: 2 }]
        })
    });

    const text = await calcRes.text();
    console.log('Status:', calcRes.status);
    console.log('Response:', text);

    if (calcRes.ok) {
        console.log('✅ API Test Passed');
    } else {
        console.error('❌ API Test Failed');
    }
}

main().catch(console.error);
