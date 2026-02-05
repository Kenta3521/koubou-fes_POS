import { Request, Response, NextFunction } from 'express';
import * as discountService from '../services/discountService.js';

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
        const { id } = req.params;
        await discountService.remove(id);

        res.json({
            success: true,
            message: 'Discount deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

