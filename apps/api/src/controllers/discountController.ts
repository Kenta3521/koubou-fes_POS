import { Request, Response, NextFunction } from 'express';
import * as discountService from '../services/discountService.js';

export const getDiscounts = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { orgId } = req.params;

        // 権限チェックはMiddlewareで行われている前提（routesで設定）

        const discounts = await discountService.findAll(orgId);

        res.json({
            success: true,
            data: discounts,
        });
    } catch (error) {
        next(error);
    }
};
