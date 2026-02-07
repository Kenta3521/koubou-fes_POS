// Enum definitions from DB設計書.md

export const Role = {
    ADMIN: 'ADMIN',
    STAFF: 'STAFF',
    PENDING: 'PENDING',
    TMP: 'TMP',
} as const;

export type Role = typeof Role[keyof typeof Role];

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    DEACTIVATED = 'DEACTIVATED',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    PAYPAY = 'PAYPAY',
}

export enum StockChangeReason {
    SALE = 'SALE',
    REPLENISH = 'REPLENISH',
    ADJUSTMENT = 'ADJUSTMENT',
    RETURN = 'RETURN',
}

export enum DiscountType {
    FIXED = 'FIXED',
    PERCENT = 'PERCENT',
}

export enum DiscountTargetType {
    ORDER_TOTAL = 'ORDER_TOTAL',
    SPECIFIC_PROD = 'SPECIFIC_PROD',
    CATEGORY = 'CATEGORY',
}

export enum DiscountConditionType {
    NONE = 'NONE',
    MIN_QUANTITY = 'MIN_QUANTITY',
    MIN_AMOUNT = 'MIN_AMOUNT',
}

export enum DiscountTriggerType {
    MANUAL = 'MANUAL',
    AUTO = 'AUTO',
}

