import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { calculateOrder } from '../src/services/calculationService.js';

async function main() {
    console.log('🧪 Verifying Calculation Logic...');

    // List all orgs to debug
    const allOrgs = await prisma.organization.findMany();
    console.log('All Orgs:', allOrgs);

    const org = await prisma.organization.findFirst({ where: { inviteCode: 'YAKISOBA2026' } });
    if (!org) throw new Error('Org not found');

    const yakisoba = await prisma.product.findFirst({ where: { name: '焼きそば（並）', organizationId: org.id } });
    const cola = await prisma.product.findFirst({ where: { name: 'コーラ', organizationId: org.id } });
    const staffDiscount = await prisma.discount.findFirst({ where: { name: 'スタッフ割', organizationId: org.id } });

    if (!yakisoba || !cola || !staffDiscount) throw new Error('Data not found');

    // Test 1: Yakisoba (Time Sale)
    console.log('\n--- Test 1: Yakisoba Time Sale ---');
    console.log('Original Price:', yakisoba.price);
    const result1 = await calculateOrder(org.id, [{ productId: yakisoba.id, quantity: 1 }]);
    const item1 = result1.items[0];
    console.log('Result Unit Price:', item1.unitPrice);
    console.log('Discount applied:', item1.appliedDiscount?.name);

    if (item1.discountAmount === 50 && item1.appliedDiscount?.name?.includes('タイムセール')) {
        console.log('✅ Success: Auto Time Sale Applied');
    } else {
        console.error('❌ Failed: Time Sale not applied');
    }

    // Test 2: Cola (Quantity Discount)
    console.log('\n--- Test 2: Cola Set (Qty 3) ---');
    console.log('Original Price:', cola.price);
    // Case 2a: Qty 2 (Should NOT apply)
    const result2a = await calculateOrder(org.id, [{ productId: cola.id, quantity: 2 }]);
    if (!result2a.items[0].appliedDiscount) {
        console.log('✅ Success: No discount for Qty 2');
    } else {
        console.error('❌ Failed: Discount applied for Qty 2');
    }

    // Case 2b: Qty 3 (Should apply)
    const result2b = await calculateOrder(org.id, [{ productId: cola.id, quantity: 3 }]);
    const item2b = result2b.items[0];
    console.log('Result Unit Price (Qty 3):', item2b.unitPrice);
    console.log('Discount applied:', item2b.appliedDiscount?.name);

    if (item2b.discountAmount === 30 && item2b.appliedDiscount?.name?.includes('3本以上')) {
        console.log('✅ Success: Quantity Discount Applied');
    } else {
        console.error('❌ Failed: Quantity Discount not applied');
    }

    // Test 3: Manual Discount
    console.log('\n--- Test 3: Staff Discount (Manual) ---');
    // Staff discount is 200 off total.
    // Buy 1 Yakisoba (350 discounted) + 1 Cola (150 normal) = 500.
    // Total should be 500 - 200 = 300.
    const result3 = await calculateOrder(org.id,
        [
            { productId: yakisoba.id, quantity: 1 },
            { productId: cola.id, quantity: 1 }
        ],
        staffDiscount.id
    );

    console.log('Subtotal (Gross):', result3.subtotalAmount); // 400 + 150 = 550
    // Net total (after item discount): 350 + 150 = 500.
    console.log('Total Amount:', result3.totalAmount);
    console.log('Applied Order Discount:', result3.appliedOrderDiscount?.name);

    // Expected: Yakisoba 350 (50 off), Cola 150 (0 off). Net 500. Staff Disc 200. Total 300.
    if (result3.totalAmount === 300 && result3.appliedOrderDiscount?.name === 'スタッフ割') {
        console.log('✅ Success: Manual Discount Applied correctly on top of Auto discount');
    } else {
        console.error(`❌ Failed: Expected 300, got ${result3.totalAmount}`);
    }
}

main().catch(console.error);
