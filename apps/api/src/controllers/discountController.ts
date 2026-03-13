import { Request, Response, NextFunction } from 'express';
import * as discountService from '../services/discountService.js';
import { createAuditLog } from '../services/auditService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export const getDiscounts = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { orgId } = req.params;
        const discounts = await discountService.findAll(orgId);

        res.json({
            success: true,
            data: discounts,
        });
    } catch (error) {
        next(error);
    }
};

export const createDiscount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { orgId } = req.params;
        const discount = await discountService.create(orgId, req.body);

        // 監査ログ記録: 割引作成
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'DISCOUNT_CREATE',
                category: 'DISCOUNT',
                organizationId: orgId,
                targetId: discount.id,
                payload: {
                    discountId: discount.id,
                    discountName: req.body.name,
                    value: req.body.value,
                    type: req.body.type
                },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.status(201).json({
            success: true,
            data: discount,
        });
    } catch (error) {
        next(error);
    }
};

export const updateDiscount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const discount = await discountService.update(id, req.body);

        // 監査ログ記録: 割引更新
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'DISCOUNT_UPDATE',
                category: 'DISCOUNT',
                organizationId: discount.organizationId,
                targetId: id,
                payload: {
                    discountId: id,
                    discountName: discount.name,
                    changes: req.body
                },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.json({
            success: true,
            data: discount,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteDiscount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id, orgId } = req.params;
        const discount = await discountService.findById(id);
        await discountService.remove(id);

        // 監査ログ記録: 割引削除
        try {
            await createAuditLog({
                userId: req.user!.id,
                action: 'DISCOUNT_DELETE',
                category: 'DISCOUNT',
                organizationId: orgId || discount?.organizationId,
                targetId: id,
                payload: {
                    discountId: id,
                    discountName: discount?.name
                },
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
        }

        res.json({
            success: true,
            message: 'Discount deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

