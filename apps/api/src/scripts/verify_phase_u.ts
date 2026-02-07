import prisma from '../utils/prisma.js';
import { defineAbilityFor } from '../utils/casl/ability.factory.js';

async function testRBAC() {
    console.log('--- Testing RBAC Logic ---');
    // POS User: transaction:create
    const posAbility = defineAbilityFor(['transaction:create']);
    console.log('POS User can view_list product:', posAbility.can('view_list', 'product'));
    console.log('POS User can view_list discount:', posAbility.can('view_list', 'discount'));
    console.log('POS User can view_list category:', posAbility.can('view_list', 'category'));
    console.log('POS User can read product (should be false if not explicitly granted):', posAbility.can('read', 'product'));

    // Admin User: product:read
    const adminAbility = defineAbilityFor(['product:read']);
    console.log('Admin User can view_list product:', adminAbility.can('view_list', 'product'));
    console.log('Admin User can read product:', adminAbility.can('read', 'product'));
}

async function testOrgStatus() {
    console.log('\n--- Testing Org Status Enforcement (Mocking Middleware Logic) ---');
    const orgId = '923d7984-9972-4fab-83e2-877339fe4f4a'; // Existing org

    // Simulate setting org to inactive
    await prisma.organization.update({
        where: { id: orgId },
        data: { isActive: false }
    });
    console.log(`Set organization ${orgId} to isActive: false`);

    // In a real request, requireOrgRole would check membership.isActive
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    console.log('Org isActive in DB:', org?.isActive);

    // Revert for safety
    await prisma.organization.update({
        where: { id: orgId },
        data: { isActive: true }
    });
    console.log(`Reverted organization ${orgId} to isActive: true`);
}

async function listProductStock() {
    console.log('\n--- Current Product Stock for 焼きそば部 ---');
    const products = await prisma.product.findMany({
        where: { organizationId: '923d7984-9972-4fab-83e2-877339fe4f4a' },
        select: { name: true, stock: true }
    });
    products.forEach(p => console.log(`${p.name}: ${p.stock}`));
}

async function main() {
    try {
        await testRBAC();
        await testOrgStatus();
        await listProductStock();
    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
