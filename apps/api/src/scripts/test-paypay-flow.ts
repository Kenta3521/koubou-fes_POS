import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

import prisma from '../utils/prisma';
import { PAYPAY } from '../lib/paypay';
import { TransactionStatus, PaymentMethod } from '@prisma/client';

async function testPayPayCreation() {
    console.log('Testing PayPay QR Creation Flow...');

    // Force re-configuration for the script
    PAYPAY.Configure({
        clientId: process.env.PAYPAY_API_KEY || '',
        clientSecret: process.env.PAYPAY_API_SECRET || '',
        merchantId: process.env.PAYPAY_MERCHANT_ID || '',
        productionMode: process.env.PAYPAY_PRODUCTION === 'true',
    });

    try {
        // 1. Get an organization and user
        const organization = await prisma.organization.findFirst();
        const user = await prisma.user.findFirst();

        if (!organization || !user) {
            console.error('No organization or user found in DB. Run seed first.');
            return;
        }

        console.log(`Using Org: ${organization.name} (${organization.id})`);
        console.log(`Using User: ${user.name} (${user.id})`);

        // 2. Clear any existing pending transactions for this test (optional)

        // 3. Create a PENDING transaction
        const transaction = await prisma.transaction.create({
            data: {
                organizationId: organization.id,
                userId: user.id,
                paymentMethod: PaymentMethod.PAYPAY,
                totalAmount: 100,
                discountAmount: 0,
                status: TransactionStatus.PENDING,
                items: {
                    create: [] // Simple test without items
                }
            }
        });

        console.log(`Created Transaction: ${transaction.id}`);

        // 4. Implement logic similar to the controller
        const merchantPaymentId = `${transaction.id.substring(0, 8)}-${Date.now()}`;

        const payload = {
            merchantPaymentId,
            amount: {
                amount: transaction.totalAmount,
                currency: 'JPY',
            },
            codeType: 'ORDER_QR',
            orderDescription: `${organization.name} でのテスト会計`,
            isAuthorization: false,
        };

        console.log('Calling PayPay QRCodeCreate...');
        const response = await (PAYPAY as any).QRCodeCreate(payload);

        if (response.BODY && response.BODY.resultInfo && response.BODY.resultInfo.code === 'SUCCESS') {
            console.log('✅ QR Code Created Successfully!');
            console.log('URL:', response.BODY.data.url);

            // 5. Update DB
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { paypayOrderId: merchantPaymentId }
            });
            console.log('✅ DB Updated with paypayOrderId');
        } else {
            console.error('❌ PayPay QR Creation Failed:', response.BODY?.resultInfo || response);
        }

    } catch (error: any) {
        console.error('❌ Error during test:', error.message || error);
    } finally {
        await prisma.$disconnect();
    }
}

testPayPayCreation();
