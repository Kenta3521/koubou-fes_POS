import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export const getOrganizationList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const organizations = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                inviteCode: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({
            success: true,
            data: organizations,
        });
    } catch (error) {
        next(error);
    }
};

export const getOrganizationSalesList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const organizations = await prisma.organization.findMany({
            include: {
                transactions: {
                    where: {
                        status: 'COMPLETED',
                    },
                    select: {
                        totalAmount: true,
                    }
                }
            }
        });

        const data = organizations.map(org => {
            const totalSales = org.transactions.reduce((sum, txn) => sum + txn.totalAmount, 0);
            return {
                id: org.id,
                name: org.name,
                totalSales,
                transactionCount: org.transactions.length,
            };
        }).sort((a, b) => b.totalSales - a.totalSales);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};
