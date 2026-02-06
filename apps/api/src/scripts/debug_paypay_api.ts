
import { Client } from 'pg';
import PAYPAY from '@paypayopa/paypayopa-sdk-node';

const DB_CONFIG = {
    connectionString: 'postgresql://postgres:postgres@localhost:5432/koubou_pos'
};

const PAYPAY_CONFIG = {
    clientId: 'a_zygDy6Nt2f_e2LK',
    clientSecret: '0T6yfVBhD+69CRfNKy2Y1TppGDaGKGVbwXPJkbQQ1Q8=',
    merchantId: '990268679139330311',
    productionMode: false
};

PAYPAY.Configure(PAYPAY_CONFIG);

const MANUAL_ID = '1b7f99ef-1770333656772';

async function main() {
    // skip DB for now, just test this ID
    /* const client = new Client(DB_CONFIG); await client.connect(); */

    console.log(`Testing with MANUAL ID: ${MANUAL_ID}`);
    try {
        const r = await (PAYPAY as any).GetPaymentDetails(MANUAL_ID);
        console.log('Result:', JSON.stringify(r.BODY || r, null, 2));
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

main();
