import PAYPAY from '@paypayopa/paypayopa-sdk-node';

/**
 * PayPay SDK Client Initialization
 */
PAYPAY.Configure({
    clientId: process.env.PAYPAY_API_KEY || '',
    clientSecret: process.env.PAYPAY_API_SECRET || '',
    merchantId: process.env.PAYPAY_MERCHANT_ID || '',
    productionMode: process.env.PAYPAY_PRODUCTION === 'true',
});

export { PAYPAY };
export default PAYPAY;
