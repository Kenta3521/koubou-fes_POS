import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../utils/prisma';
import pkg from '@prisma/client';
const { TransactionStatus, PaymentMethod } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testWebhook() {
    console.log('Testing Webhook Flow...');

    // 1. Create a dummy PENDING transaction to complete
    const organization = await prisma.organization.findFirst();
    const user = await prisma.user.findFirst();
    if (!organization || !user) {
        console.error('Seed db first');
        return;
    }

    const transaction = await prisma.transaction.create({
        data: {
            organizationId: organization.id,
            userId: user.id,
            paymentMethod: PaymentMethod.PAYPAY,
            totalAmount: 100,
            discountAmount: 0,
            status: TransactionStatus.PENDING,
            paypayOrderId: `TEST-${Date.now()}`,
            items: {
                create: []
            }
        }
    });

    console.log(`Created test transaction: ${transaction.id} / OrderID: ${transaction.paypayOrderId}`);

    // 2. Prepare Payload
    const payload = {
        notification_type: "Transaction",
        store_id: "test_store",
        paid_at: new Date().toISOString(),
        merchant_order_id: transaction.paypayOrderId,
        state: "COMPLETED",
        order_amount: 100
    };

    const requestBody = JSON.stringify(payload);
    // Note: Localhost URL handling in signature verification is tricky.
    // In our implementation we check `req.originalUrl`. 
    // If we post to `http://localhost:3001/api/v1/webhooks/paypay`, 
    // Express sees `/api/v1/webhooks/paypay`.
    // Use 127.0.0.1 to avoid Node fetch IPv6 issues
    const url = 'http://127.0.0.1:3001/api/v1/webhooks/paypay';

    // 3. Generate Signature
    const apiSecret = process.env.PAYPAY_API_SECRET || '';
    if (!apiSecret) throw new Error('No API Secret');

    const dataToSign = url + requestBody;
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(dataToSign);
    const signature = hmac.digest('base64');

    console.log(`Sending Webhook to ${url}`);
    console.log(`Signature: ${signature}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PayPay-Signature': signature
            },
            body: JSON.stringify(payload)
        });

        console.log('Response:', response.status);

        // 4. Verify DB Status
        const updated = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        console.log(`Transaction Status: ${updated?.status}`);

        if (updated?.status === TransactionStatus.COMPLETED) {
            console.log('✅ Webhook verified successfully!');
        } else {
            console.error('❌ Transaction status not updated.');
        }

    } catch (error: any) {
        console.error('Request failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testWebhook();
