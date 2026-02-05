
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import prisma from '../utils/prisma.js';
import { Role, DiscountType, DiscountTargetType, DiscountConditionType, DiscountTriggerType } from '@koubou-fes-pos/shared';
import * as discountService from '../services/discountService.js';

async function verifyDiscountManagement() {
    console.log('Testing P4-017 to P4-019: Discount Management API & Auth...');

    try {
        const organization = await prisma.organization.findFirst({ include: { members: true } });
        if (!organization) {
            console.error('No organization found.');
            return;
        }

        const orgId = organization.id;
        const adminUser = organization.members.find(m => m.role === Role.ADMIN);

        if (!adminUser) {
            console.error('No admin user found for testing.');
            return;
        }

        // 1. Create Discount
        console.log('1. Creating Discount...');
        const newDiscount = await discountService.create(orgId, {
            name: 'Test Flash Sale',
            type: DiscountType.PERCENT,
            value: 10,
            targetType: DiscountTargetType.ORDER_TOTAL,
            triggerType: DiscountTriggerType.MANUAL,
            isActive: true
        });
        console.log(`✅ Discount created: ${newDiscount.name} (ID: ${newDiscount.id})`);

        // 2. Find All
        console.log('2. Listing Discounts...');
        const discounts = await discountService.findAll(orgId);
        const found = discounts.find(d => d.id === newDiscount.id);
        if (found) {
            console.log('✅ PASS: Discount found in list.');
        } else {
            console.error('❌ FAIL: Discount NOT found in list.');
        }

        // 3. Update
        console.log('3. Updating Discount...');
        const updated = await discountService.update(newDiscount.id, { value: 15 });
        if (updated.value === 15) {
            console.log('✅ PASS: Discount updated successfully.');
        } else {
            console.error('❌ FAIL: Discount update failed.');
        }

        // 4. Delete (Logical)
        console.log('4. Deleting Discount...');
        await discountService.remove(newDiscount.id);
        const afterDelete = await discountService.findById(newDiscount.id);
        if (afterDelete && afterDelete.isActive === false) {
            console.log('✅ PASS: Discount logically deleted (isActive=false).');
        } else {
            console.error('❌ FAIL: Discount deletion failed.');
        }

        // 5. Cleanup
        await prisma.discount.delete({ where: { id: newDiscount.id } });
        console.log('Cleanup completed.');

    } catch (error) {
        console.error('Test script error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyDiscountManagement();
