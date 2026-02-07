
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../utils/prisma';
import pkg from '@prisma/client';
const { TransactionStatus } = pkg;
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const API_URL = 'http://localhost:3001/api/v1';

async function verifyPhase3() {
    console.log('🚀 Starting Phase 3 Comprehensive Verification...');

    // 1. Authenticate & Get Context
    const user = await prisma.user.findFirst({
        include: { organizations: true }
    });

    if (!user) {
        console.error('❌ Preparation: No user found in DB.');
        return;
    }

    const orgMembership = user.organizations[0];
    if (!orgMembership) {
        console.error('❌ Preparation: User belongs to no organization.');
        return;
    }

    const activeOrganizationId = orgMembership.organizationId;
    const activeOrganization = await prisma.organization.findUnique({
        where: { id: activeOrganizationId }
    });

    if (!activeOrganization) {
        console.error('❌ Preparation: Organization not found.');
        return;
    }

    // Generate Token
    const payload = {
        userId: user.id,
        email: user.email,
        role: (orgMembership as any).role, // Cast to any to bypass temporary type issues or use actual field
        organizationId: activeOrganizationId
    };
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };

    console.log(`✅ Auth Token Acquired for User: ${user.email}`);
    console.log(`✅ Using Org: ${activeOrganization.name} (${activeOrganizationId})`);

    // 2. Get Valid Product for this Org
    const product = await prisma.product.findFirst({
        where: { organizationId: activeOrganizationId }
    });

    if (!product) {
        console.error('❌ Preparation: No products found for this organization.');
        return;
    }
    console.log(`✅ Using Product: ${product.name} (${product.id})`);

    // P3-004: Create PayPay Payment & QR Code
    console.log('\n--- Testing P3-004 (Create API) ---');
    let transactionId;
    try {
        // Create Transaction first
        const txnRes = await axios.post(`${API_URL}/organizations/${activeOrganizationId}/transactions`, {
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'PAYPAY'
        }, { headers });
        transactionId = txnRes.data.data.id;

        // Create QR
        const qrRes = await axios.post(`${API_URL}/organizations/${activeOrganizationId}/transactions/${transactionId}/paypay/create`, {}, { headers });

        if (qrRes.data.data.qrCodeUrl) {
            console.log('✅ P3-004: QR Code URL generated successfully.');
        } else {
            console.error('❌ P3-004: QR Code URL missing.');
        }
    } catch (e: any) {
        console.error('❌ P3-004 Failed:', e.response?.data || e.message);
    }

    // P3-016: Status Check API (Before Completion)
    console.log('\n--- Testing P3-016 (Status Check API - Pending) ---');
    try {
        const statusRes = await axios.get(`${API_URL}/organizations/${activeOrganizationId}/transactions/${transactionId}/paypay/status`, { headers });
        if (statusRes.data.data.status === 'PENDING') {
            console.log('✅ P3-016: Status verified as PENDING.');
        } else {
            console.error('❌ P3-016: Unexpected status:', statusRes.data.data);
        }
    } catch (e: any) {
        console.error('❌ P3-016 Failed:', e.response?.data || e.message);
    }

    // P3-011: Cancel Transaction
    console.log('\n--- Testing P3-011 (Cancel API) ---');
    try {
        const cancelRes = await axios.post(`${API_URL}/organizations/${activeOrganizationId}/transactions/${transactionId}/cancel`, {}, { headers });
        if (cancelRes.data.data.status === 'CANCELED') {
            console.log('✅ P3-011: Transaction cancelled successfully.');
        } else {
            console.error('❌ P3-011: JSON response ok but status not CANCELED.');
        }
    } catch (e: any) {
        console.error('❌ P3-011 Failed:', e.response?.data || e.message);
    }

    // Prepare a new transaction for Webhook Testing
    let webhookTxId;
    let paypayOrderId;
    try {
        const txnRes = await axios.post(`${API_URL}/organizations/${activeOrganizationId}/transactions`, {
            items: [{ productId: product.id, quantity: 1 }],
            paymentMethod: 'PAYPAY'
        }, { headers });
        webhookTxId = txnRes.data.data.id;

        // Generate QR to get paypayOrderId
        const qrRes = await axios.post(`${API_URL}/organizations/${activeOrganizationId}/transactions/${webhookTxId}/paypay/create`, {}, { headers });
        paypayOrderId = qrRes.data.data.merchantPaymentId;
        console.log(`\nCreated new transaction for Webhook test: ${webhookTxId}`);
    } catch (e) { console.error('Setup failed for webhook test'); }

    // P3-013: Signature Verification (Invalid Case)
    console.log('\n--- Testing P3-013 (Signature Verification - Invalid) ---');
    try {
        await axios.post(`${API_URL}/webhooks/paypay`, {}, {
            headers: { 'X-PayPay-Signature': 'invalid_signature' }
        });
        console.error('❌ P3-013: Request with invalid signature should have failed but succeeded.');
    } catch (e: any) {
        if (e.response?.status === 400 || e.response?.status === 403 || e.response?.status === 401) {
            console.log(`✅ P3-013: Blocked invalid signature (Status: ${e.response.status}).`);
        } else {
            console.error(`❌ P3-013: Unexpected error code: ${e.response?.status}`);
        }
    }

    // P3-012 & P3-014: Webhook Success & Status Update
    console.log('\n--- Testing P3-012/P3-014 (Valid Webhook & Status Update) ---');
    if (paypayOrderId) {
        const payload = {
            notification_type: "Transaction",
            store_id: "test_store",
            paid_at: new Date().toISOString(),
            merchant_order_id: paypayOrderId,
            state: "COMPLETED",
            order_amount: 100
        };
        const body = JSON.stringify(payload);
        const url = `${API_URL}/webhooks/paypay`;
        const apiSecret = process.env.PAYPAY_API_SECRET || '';
        const hmac = crypto.createHmac('sha256', apiSecret);
        hmac.update(url + body);
        const signature = hmac.digest('base64');

        try {
            const res = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-PayPay-Signature': signature
                }
            });
            console.log(`✅ P3-012: Webhook Endpoint accepted request (Status: ${res.status}).`);

            // Verify P3-014 (DB Update)
            const updatedTx = await prisma.transaction.findUnique({ where: { id: webhookTxId } });
            if (updatedTx?.status === TransactionStatus.COMPLETED) {
                console.log('✅ P3-014: Transaction status updated to COMPLETED in DB.');
            } else {
                console.error(`❌ P3-014: DB status mismatch. Got: ${updatedTx?.status}`);
            }

        } catch (e: any) {
            console.error('❌ P3-012/014 Failed:', e.response?.data || e.message);
        }
    }

    // P3-016: Status Check API (After Completion)
    console.log('\n--- Testing P3-016 (Status Check API - Completed) ---');
    try {
        const statusRes = await axios.get(`${API_URL}/organizations/${activeOrganizationId}/transactions/${webhookTxId}/paypay/status`, { headers });
        if (statusRes.data.data.status === 'COMPLETED') {
            console.log('✅ P3-016: Status verified as COMPLETED.');
        } else {
            console.error('❌ P3-016: Unexpected status:', statusRes.data.data);
        }
    } catch (e: any) {
        console.error('❌ P3-016 Failed:', e.response?.data || e.message);
    }

    console.log('\nVerification Complete.');
    process.exit(0);
}

verifyPhase3();
