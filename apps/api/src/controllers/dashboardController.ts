import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import { TransactionStatus } from '@koubou-fes-pos/shared';
import os from 'os';

/**
 * ダッシュボードサマリ取得
 * GET /api/v1/organizations/:orgId/dashboard/summary
 */
export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);

        // 基本的な集計 (完了済み取引対象)
        const completedTxWhere = {
            organizationId: orgId,
            status: TransactionStatus.COMPLETED as any,
        };

        const [totalStats, lastHourTx, prevHourTx] = await Promise.all([
            prisma.transaction.aggregate({
                where: completedTxWhere,
                _sum: { totalAmount: true },
                _count: { id: true },
            }),
            prisma.transaction.aggregate({
                where: {
                    ...completedTxWhere,
                    createdAt: { gte: oneHourAgo },
                },
                _sum: { totalAmount: true },
            }),
            prisma.transaction.aggregate({
                where: {
                    ...completedTxWhere,
                    createdAt: { gte: twoHoursAgo, lt: oneHourAgo },
                },
                _sum: { totalAmount: true },
            }),
        ]);

        const currentHourSales = lastHourTx._sum.totalAmount || 0;
        const prevHourSales = prevHourTx._sum.totalAmount || 0;

        let growthRate = 0;
        if (prevHourSales > 0) {
            growthRate = ((currentHourSales - prevHourSales) / prevHourSales) * 100;
        } else if (currentHourSales > 0) {
            growthRate = 100; // 前時が0で今時がある場合は100%増
        }

        res.json({
            success: true,
            data: {
                totalSales: totalStats._sum.totalAmount || 0,
                totalCustomers: totalStats._count.id || 0,
                lastHourSales: currentHourSales,
                growthRate: parseFloat(growthRate.toFixed(1)),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 売上推移取得 (30分単位)
 * GET /api/v1/organizations/:orgId/dashboard/trends
 */
export const getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const transactions = await prisma.transaction.findMany({
            where: {
                organizationId: orgId,
                status: TransactionStatus.COMPLETED as any,
                createdAt: { gte: startOfDay },
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: { category: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
        });

        // 30分スロットにグルーピング
        const slots: { [key: string]: any } = {};

        transactions.forEach(tx => {
            const date = tx.createdAt;
            const minutes = date.getMinutes();
            const slotMinutes = minutes < 30 ? '00' : '30';
            const timeKey = `${date.getHours().toString().padStart(2, '0')}:${slotMinutes}`;

            if (!slots[timeKey]) {
                slots[timeKey] = {
                    time: timeKey,
                    sales: 0,
                    customers: 0,
                    categories: {} as { [key: string]: number },
                };
            }

            slots[timeKey].sales += tx.totalAmount;
            slots[timeKey].customers += 1;

            tx.items.forEach(item => {
                const catName = item.product.category?.name || 'その他';
                slots[timeKey].categories[catName] = (slots[timeKey].categories[catName] || 0) + (item.unitPrice * item.quantity - item.discountAmount);
            });
        });

        // 配列に変換してソート
        const trendData = Object.values(slots).sort((a, b) => a.time.localeCompare(b.time));

        res.json({
            success: true,
            data: trendData,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * カテゴリ別売上取得
 * GET /api/v1/organizations/:orgId/dashboard/category-sales
 */
export const getCategorySales = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;

        // TransactionItemからカテゴリごとに集計
        // 効率のためqueryRawを使用するか、JSで集計
        const items = await prisma.transactionItem.findMany({
            where: {
                transaction: {
                    organizationId: orgId,
                    status: TransactionStatus.COMPLETED as any,
                }
            },
            include: {
                product: {
                    include: { category: true }
                }
            }
        });

        const categorySummary: { [key: string]: number } = {};
        items.forEach(item => {
            const catName = item.product.category?.name || 'その他';
            const amount = (item.unitPrice * item.quantity) - item.discountAmount;
            categorySummary[catName] = (categorySummary[catName] || 0) + amount;
        });

        const data = Object.entries(categorySummary).map(([name, value]) => ({
            name,
            value,
        }));

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 在庫状況取得
 * GET /api/v1/organizations/:orgId/dashboard/inventory
 */
export const getInventoryStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;

        const products = await prisma.product.findMany({
            where: {
                organizationId: orgId,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                stock: true,
                isActive: true,
            },
        });

        const outOfStock = products.filter(p => p.stock <= 0 && p.isActive);
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5 && p.isActive);

        res.json({
            success: true,
            data: {
                outOfStock,
                lowStock,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * システムステータス・ヘルスチェック
 * GET /api/v1/organizations/:orgId/dashboard/health
 */
export const getHealth = async (_req: Request, res: Response, _next: NextFunction) => {
    try {
        // DB接続確認
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            data: {
                dbStatus: 'ONLINE',
                serverUptime: Math.floor(os.uptime()),
                memoryUsage: {
                    free: os.freemem(),
                    total: os.totalmem(),
                },
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            data: {
                dbStatus: 'OFFLINE',
                timestamp: new Date().toISOString(),
            }
        });
    }
};
