import 'dotenv/config';

async function main() {
    const baseUrl = 'http://localhost:3001/api/v1';

    // 1. Login as Yakisoba staff
    console.log('=== Test 1: Login as Yakisoba staff ===');
    const loginRes1 = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff@yakisoba.example.com', password: 'password123' })
    });

    const { token: token1, user: user1 } = (await loginRes1.json()).data;
    const yakisobaOrgId = user1.organizations[0].id;
    console.log('Yakisoba Org ID:', yakisobaOrgId);

    // 2. Login as Takoyaki staff
    console.log('\n=== Test 2: Login as Takoyaki staff ===');
    const loginRes2 = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'leader@takoyaki.example.com', password: 'password123' })
    });

    const { token: token2, user: user2 } = (await loginRes2.json()).data;
    const takoyakiOrgId = user2.organizations[0].id;
    console.log('Takoyaki Org ID:', takoyakiOrgId);

    // 3. Get Yakisoba products
    console.log('\n=== Test 3: Get Yakisoba products ===');
    const productsRes = await fetch(`${baseUrl}/organizations/${yakisobaOrgId}/products`, {
        headers: { Authorization: `Bearer ${token1}` }
    });
    const yakisobaProducts = (await productsRes.json()).data;
    const yakisobaProduct = yakisobaProducts.find((p: any) => p.name.includes('焼きそば'));
    console.log('Yakisoba product:', yakisobaProduct.name, yakisobaProduct.id);

    // 4. Try to calculate with Yakisoba product in Takoyaki org (should fail)
    console.log('\n=== Test 4: Cross-organization validation (should fail) ===');
    const calcRes = await fetch(`${baseUrl}/organizations/${takoyakiOrgId}/transactions/calculate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token2}`
        },
        body: JSON.stringify({
            items: [{ productId: yakisobaProduct.id, quantity: 1 }]
        })
    });

    const calcResult = await calcRes.json();
    console.log('Status:', calcRes.status);
    console.log('Response:', JSON.stringify(calcResult, null, 2));

    if (calcRes.status === 400 && calcResult.error?.message?.includes('別の組織')) {
        console.log('✅ Cross-organization validation works correctly!');
    } else {
        console.log('❌ Expected error for cross-organization product');
    }

    // 5. Normal calculation with correct org (should succeed)
    console.log('\n=== Test 5: Normal calculation (should succeed) ===');
    const calcRes2 = await fetch(`${baseUrl}/organizations/${yakisobaOrgId}/transactions/calculate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token1}`
        },
        body: JSON.stringify({
            items: [{ productId: yakisobaProduct.id, quantity: 1 }]
        })
    });

    const calcResult2 = await calcRes2.json();
    console.log('Status:', calcRes2.status);

    if (calcRes2.ok) {
        console.log('✅ Normal calculation works!');
        console.log('Total:', calcResult2.data.totalAmount);
    } else {
        console.log('❌ Normal calculation failed');
        console.log('Response:', JSON.stringify(calcResult2, null, 2));
    }
}

main().catch(console.error);
