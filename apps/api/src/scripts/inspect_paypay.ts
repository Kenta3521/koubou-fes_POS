
import 'dotenv/config';
import PAYPAY from '@paypayopa/paypayopa-sdk-node';

console.log(Object.keys(PAYPAY));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(PAYPAY)));
// If it's a class instance
// console.log(Object.getOwnPropertyNames(PAYPAY.prototype));
