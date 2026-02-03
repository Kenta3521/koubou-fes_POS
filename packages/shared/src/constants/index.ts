// Enum definitions from DB設計書.md

export enum Role {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
}

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
