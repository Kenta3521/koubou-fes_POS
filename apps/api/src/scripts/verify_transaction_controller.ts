
import { Request, Response } from 'express';
import { getTransactions, getTransactionDetail } from '../controllers/transactionController.js';
import prisma from '../utils/prisma.js';
import { TransactionStatus } from '@prisma/client';

// Mock Express objects
const mockResponse = () => {
    const res: any = {};
    res.json = (data: any) => {
        console.log('Result JSON:', JSON.stringify(data, null, 2));
        return res;
    };
    res.status = (code: number) => {
        console.log('Status:', code);
        return res;
    };
    return res;
};

const mockNext = (err: any) => {
    if (err) console.error('Next called with error:', err);
};

async function main() {
    console.log('Starting Transaction Controller Verification...');

    // 1. Setup: Find an org with transactions
    const org = await prisma.organization.findFirst({
        where: { isActive: true },
        include: { transactions: true }
    });

    if (!org) {
        console.error('No active organization found.');
        return;
    }

    console.log(`Using Org: ${org.name} (${org.id})`);

    // Ensure at least one transaction exists
    let txId = org.transactions[0]?.id;
    if (!txId) {
        console.log('No transactions found. Please create one manual transaction in POS first or use existing data.');
        // We could create one, but let's assume dev env has data or user can create.
        // For now, let's create a dummy one if none.
        const user = await prisma.user.findFirst();
        if (user) {
            const tx = await prisma.transaction.create({
                data: {
                    organizationId: org.id,
                    userId: user.id,
                    totalAmount: 1000,
                    status: 'COMPLETED',
                    paymentMethod: 'CASH',
                    items: {
                        create: {
                            productId: 'dummy',
                            unitPrice: 1000,
                            quantity: 1,
                        } as any
                    }
                }
            });
            txId = tx.id;
            console.log('Created dummy transaction:', txId);
        }
    }

    // 2. Test getTransactions (List)
    console.log('\n--- Testing getTransactions (Page 1, Limit 5) ---');
    const reqList = {
        params: { orgId: org.id },
        query: { page: '1', limit: '5' }
    } as unknown as Request;

    await getTransactions(reqList, mockResponse() as Response, mockNext);

    // 3. Test getTransactions with Status Filter
    console.log('\n--- Testing getTransactions (Filter: COMPLETED) ---');
    const reqFilter = {
        params: { orgId: org.id },
        query: { status: 'COMPLETED' }
    } as unknown as Request;
    await getTransactions(reqFilter, mockResponse() as Response, mockNext);

    // 4. Test getTransactionDetail
    if (txId) {
        console.log(`\n--- Testing getTransactionDetail (${txId}) ---`);
        const reqDetail = {
            params: { orgId: org.id, id: txId }
        } as unknown as Request;
        await getTransactionDetail(reqDetail, mockResponse() as Response, mockNext);
    }

    console.log('\nVerification Complete.');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
