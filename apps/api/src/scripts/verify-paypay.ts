import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { PAYPAY } from '../lib/paypay';

// Force re-configuration for the script to ensure env vars are used
PAYPAY.Configure({
    clientId: process.env.PAYPAY_API_KEY || '',
    clientSecret: process.env.PAYPAY_API_SECRET || '',
    merchantId: process.env.PAYPAY_MERCHANT_ID || '',
    productionMode: process.env.PAYPAY_PRODUCTION === 'true',
});

async function verifyPayPay() {
    console.log('Testing PayPay API connectivity...');
    console.log('Merchant ID:', process.env.PAYPAY_MERCHANT_ID);

    const payload = {
        merchantPaymentId: `test-${Date.now()}`,
        amount: {
            amount: 1,
            currency: 'JPY',
        },
        codeType: 'ORDER_QR',
        orderDescription: 'Authentication Test',
        isAuthorization: false,
    };

    try {
        // Calling QR code creation as a connectivity test
        // qrcodeCreate is the standard method for user-scan QR
        const response = await (PAYPAY as any).QRCodeCreate(payload);

        if (response.BODY && response.BODY.resultInfo && response.BODY.resultInfo.code === 'SUCCESS') {
            console.log('✅ PayPay API connection success!');
            console.log('Data:', response.BODY.data);
        } else {
            console.error('❌ PayPay API returned error info:');
            console.error(response.BODY?.resultInfo || response);
        }
    } catch (error: any) {
        console.error('❌ PayPay API Authentication/Connectivity Failed:');
        if (error.response?.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message || error);
        }
    }
}

verifyPayPay();
