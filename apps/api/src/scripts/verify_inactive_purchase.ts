
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import prisma from '../utils/prisma.js';
import { calculateOrder } from '../services/calculationService.js';

async function verifyInactivePurchase() {
    console.log('Testing P4-017 (Updated): Prevent Purchasing Inactive Products at Calculation Stage...');

    try {
        // 1. Setup Data
        const organization = await prisma.organization.findFirst();

        if (!organization) {
            console.error('No organization found. Cannot run test.');
            return;
        }

        console.log(`Using Org: ${organization.name}`);

        // Create a test product
        const product = await prisma.product.create({
            data: {
                name: 'Inactive Calc Test Product',
                price: 1000,
                stock: 10,
                organizationId: organization.id,
                categoryId: (await prisma.category.findFirst({ where: { organizationId: organization.id } }))?.id || '',
                isActive: false, // Explicitly INACTIVE
            }
        });

        console.log(`Created INACTIVE product: ${product.name} (${product.id})`);

        // 2. Attempt to calculate order
        console.log('Attempting to calculate order with inactive product...');
        try {
            await calculateOrder(
                organization.id,
                [{ productId: product.id, quantity: 1 }]
            );
            console.error('❌ Test FAILED: Calculation succeeded but should have failed.');
        } catch (error: any) {
            if (error.message.includes('PRODUCT_NOT_AVAILABLE') && error.message.includes('販売停止中')) {
                console.log('✅ Test PASSED: Calculation failed as expected with PRODUCT_NOT_AVAILABLE (販売停止中).');
            } else {
                console.error('❌ Test FAILED: Unexpected error message:', error.message);
            }
        }

        // 3. Cleanup
        await prisma.product.delete({ where: { id: product.id } });
        console.log('Cleanup completed.');

    } catch (error) {
        console.error('Test script error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyInactivePurchase();
