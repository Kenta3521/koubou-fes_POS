import prisma from '../utils/prisma.js';

export const findAll = async (organizationId: string) => {
    return prisma.discount.findMany({
        where: {
            organizationId,
            // 管理画面用には非アクティブも表示したい場合があるが、
            // POS用との共通化を考えるならここでは全件取得し、必要に応じてフィルタする
        },
        orderBy: [
            { priority: 'desc' },
            { name: 'asc' }
        ],
        include: {
            product: true,
            category: true,
        }
    });
};

export const findById = async (id: string) => {
    return prisma.discount.findUnique({
        where: { id },
        include: { product: true, category: true }
    });
};

export const create = async (organizationId: string, data: any) => {
    return prisma.discount.create({
        data: {
            ...data,
            organizationId,
        },
        include: { product: true, category: true }
    });
};

export const update = async (id: string, data: any) => {
    return prisma.discount.update({
        where: { id },
        data,
        include: { product: true, category: true }
    });
};

export const remove = async (id: string) => {
    // 論理削除
    return prisma.discount.update({
        where: { id },
        data: { isActive: false }
    });
};

