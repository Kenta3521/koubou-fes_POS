

import prisma from '../utils/prisma.js';
// import { PrismaClient } from '@prisma/client'; // Not needed if importing instance

// const prisma = new PrismaClient(); // Removed
const API_URL = 'http://localhost:3001/api/v1';

async function main() {
    console.log('🚀 Starting Audit Log Verification...');

    // 1. Login
    console.log('1. Logging in as Admin...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@koubou-fes.example.com',
            password: 'password123'
        })
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    }

    const loginData = await loginRes.json() as any;
    const token = loginData.data?.token;
    // Based on authController, it likely returns { success: true, token, user } or similar. 
    // Wait, let's check authController.login response structure...
    // It returns res.json({ success: true, token, user: ... })

    if (!token) throw new Error('No token returned');
    console.log('✅ Login successful');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 2. Create Organization
    console.log('2. Creating Organization...');
    const orgName = `AuditTestOrg_${Date.now()}`;
    const orgRes = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: orgName
        })
    });

    // Note: createOrganization might take inviteCode as well?
    // Looking at organizationController.createOrganization:
    // const { name, inviteCode } = req.body;
    // IF inviteCode is not provided, it generates one.

    if (!orgRes.ok) {
        throw new Error(`Create Org failed: ${orgRes.status} ${await orgRes.text()}`);
    }

    const orgData = await orgRes.json() as any;
    const orgId = orgData.data.id;
    console.log(`✅ Organization created: ${orgId}`);

    // 3. Create Role
    console.log('3. Creating Role...');
    const roleRes = await fetch(`${API_URL}/organizations/${orgId}/roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'AuditTestRole',
            description: 'Role for audit testing',
            permissionCodes: ['product:read']
        })
    });

    if (!roleRes.ok) {
        throw new Error(`Create Role failed: ${roleRes.status} ${await roleRes.text()}`);
    }
    console.log('✅ Role created');

    // 4. Create Category (Needed for Product)
    console.log('4. Creating Category...');
    const catRes = await fetch(`${API_URL}/organizations/${orgId}/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'AuditTestCategory',
            sortOrder: 1
        })
    });

    if (!catRes.ok) {
        throw new Error(`Create Category failed: ${catRes.status} ${await catRes.text()}`);
    }
    const catData = await catRes.json() as any;
    const catId = catData.data.id;
    console.log(`✅ Category created: ${catId}`);

    // 5. Create Product
    console.log('5. Creating Product...');
    const prodRes = await fetch(`${API_URL}/organizations/${orgId}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'AuditTestProduct',
            price: 1000,
            categoryId: catId,
            stock: 10,
            isActive: true
        })
    });

    if (!prodRes.ok) {
        throw new Error(`Create Product failed: ${prodRes.status} ${await prodRes.text()}`);
    }
    console.log('✅ Product created');


    // 6. Verify Logs in DB
    console.log('6. Verifying Audit Logs in DB...');

    // Allow some time for async logs if any (though await createAuditLog is awaited in controllers)
    await new Promise(r => setTimeout(r, 1000));

    const logs = await prisma.auditLog.findMany({
        where: {
            organizationId: orgId
        },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${logs.length} logs for Org ${orgId}`);
    logs.forEach(log => console.log(` - [${log.action}] ${log.category} (Target: ${log.targetId})`));

    // Expected logs:
    // 1. ORG_CREATE
    // 2. ORG_UPDATE (Maybe? Does creating an org trigger update? No, just create)
    // 3. ROLE_CREATE
    // 4. CATEGORY_CREATE
    // 5. PRODUCT_CREATE

    const actions = logs.map(l => l.action);
    if (!actions.includes('ORG_CREATE')) console.error('❌ Missing ORG_CREATE');
    if (!actions.includes('ROLE_CREATE')) console.error('❌ Missing ROLE_CREATE');
    if (!actions.includes('CATEGORY_CREATE')) console.error('❌ Missing CATEGORY_CREATE');
    if (!actions.includes('PRODUCT_CREATE')) console.error('❌ Missing PRODUCT_CREATE');

    if (actions.includes('ORG_CREATE') && actions.includes('ROLE_CREATE') && actions.includes('CATEGORY_CREATE') && actions.includes('PRODUCT_CREATE')) {
        console.log('🎉 Verification SUCCESS!');
    } else {
        console.log('⚠️ Verification Partial/Failed');
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
