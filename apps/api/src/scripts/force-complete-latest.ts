import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../utils/prisma';
import { TransactionStatus } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function forceCompleteLatest() {
    console.log('Searching for latest PENDING transaction...');

    // Find latest PENDING transaction
    const transaction = await prisma.transaction.findFirst({
        where: { status: TransactionStatus.PENDING },
        orderBy: { createdAt: 'desc' }
    });

    if (!transaction) {
        console.error('No PENDING transaction found.');
        return;
    }

    console.log(`Found Transaction: ${transaction.id}`);
    console.log(`PayPay Order ID: ${transaction.paypayOrderId}`);

    // Prepare Payload
    const payload = {
        notification_type: "Transaction",
        store_id: "test_store",
        paid_at: new Date().toISOString(),
        merchant_order_id: transaction.paypayOrderId,
        state: "COMPLETED",
        order_amount: transaction.totalAmount
    };

    // Use 127.0.0.1 to avoid Node fetch IPv6 issues
    const url = 'http://127.0.0.1:3001/api/v1/webhooks/paypay';

    // Generate Signature
    const apiSecret = process.env.PAYPAY_API_SECRET || '';
    if (!apiSecret) throw new Error('No API Secret');

    const requestBody = JSON.stringify(payload);
    const dataToSign = url + requestBody;
    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(dataToSign);
    const signature = hmac.digest('base64');

    console.log(`Sending Webhook to ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-PayPay-Signature': signature
            },
            body: requestBody
        });

        console.log('Response:', response.status);

        if (response.ok) {
            console.log('✅ Webhook sent successfully! Check the frontend.');
        } else {
            console.error('❌ Webhook rejected.');
        }

    } catch (error: any) {
        console.error('Request failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

forceCompleteLatest();
