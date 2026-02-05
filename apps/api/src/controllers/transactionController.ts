import { Request, Response, NextFunction } from 'express';
import { calculateOrder } from '../services/calculationService.js';

export const calculate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orgId } = req.params;
        const { items, manualDiscountId } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Items array is required',
                },
            });
        }

        const result = await calculateOrder(orgId, items, manualDiscountId);

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        // Handle specific business logic errors
        if (error.message?.includes('別の組織') || error.message?.includes('Product not found')) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CART_ITEMS',
                    message: error.message,
                },
            });
        }
        next(error);
    }
};
