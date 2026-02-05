import { DiscountType, DiscountTargetType, DiscountConditionType, DiscountTriggerType } from '../constants/index.js';

export interface Discount {
    id: string;
    organizationId: string;
    name: string;
    type: DiscountType;
    value: number;
    isActive: boolean;
    conditionType: DiscountConditionType;
    conditionValue: number;
    priority: number;
    targetProductId: string | null;
    targetCategoryId: string | null;
    targetType: DiscountTargetType;
    triggerType: DiscountTriggerType;
    validFrom: Date | null;
    validTo: Date | null;
    product?: {
        id: string;
        name: string;
    } | null;
    category?: {
        id: string;
        name: string;
    } | null;
}

export interface CreateDiscountRequest {
    name: string;
    type: DiscountType;
    value: number;
    isActive?: boolean;
    conditionType?: DiscountConditionType;
    conditionValue?: number;
    priority?: number;
    targetProductId?: string | null;
    targetCategoryId?: string | null;
    targetType?: DiscountTargetType;
    triggerType?: DiscountTriggerType;
    validFrom?: Date | null;
    validTo?: Date | null;
}

export type UpdateDiscountRequest = Partial<CreateDiscountRequest>;
