import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.log('Dotenv error:', result.error.message);
    // Try default
    dotenv.config();
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not found in env');
    process.exit(1);
} else {
    console.log('DATABASE_URL loaded:', connectionString.substring(0, 15) + '...');
}

const pool = new Pool({
    connectionString,
    ssl: false // Assuming verification is local, or match utils/prisma.ts
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


dotenv.config({ path: path.join(__dirname, '../../.env') });

async function triggerWebhook() {
    let txId = process.argv[2];
    if (!txId) {
        console.error('Usage: ts-node trigger_webhook_for_tx.ts <transactionId | latest>');
        process.exit(1);
    }

    console.log(`Triggering webhook target: ${txId}`);

    let transaction;

    if (txId === 'latest') {
        transaction = await prisma.transaction.findFirst({
            where: {
                status: 'PENDING',
                paypayOrderId: { not: null }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (transaction) {
            console.log(`Found latest PENDING transaction: ${transaction.id}`);
            txId = transaction.id;
        }
    } else {
        transaction = await prisma.transaction.findUnique({
            where: { id: txId }
        });
    }

    if (!transaction) {
        console.error('Transaction not found in DB');
        process.exit(1);
    }

    if (!transaction.paypayOrderId) {
        console.error('Transaction has no paypayOrderId (QR not created?)');
        process.exit(1);
    }

    console.log(`Found OrderID: ${transaction.paypayOrderId}`);

    const payload = {
        notification_type: "Transaction",
        store_id: "test_store",
        paid_at: new Date().toISOString(),
        merchant_order_id: transaction.paypayOrderId,
        state: "COMPLETED",
        order_amount: transaction.totalAmount
    };

    const requestBody = JSON.stringify(payload);
    const url = 'http://127.0.0.1:3001/api/v1/webhooks/paypay';
    const apiSecret = process.env.PAYPAY_API_SECRET || '';

    if (!apiSecret) {
        console.error('No API Secret found in env');
        process.exit(1);
    }

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

        console.log('Response Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

triggerWebhook();
