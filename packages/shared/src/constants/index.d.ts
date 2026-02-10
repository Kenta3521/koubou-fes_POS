export declare const Role: {
    readonly ADMIN: "ADMIN";
    readonly STAFF: "STAFF";
    readonly PENDING: "PENDING";
    readonly TMP: "TMP";
};
export type Role = typeof Role[keyof typeof Role];
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    DEACTIVATED = "DEACTIVATED"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    PAYPAY = "PAYPAY"
}
export declare enum StockChangeReason {
    SALE = "SALE",
    REPLENISH = "REPLENISH",
    ADJUSTMENT = "ADJUSTMENT",
    RETURN = "RETURN"
}
export declare enum DiscountType {
    FIXED = "FIXED",
    PERCENT = "PERCENT"
}
export declare enum DiscountTargetType {
    ORDER_TOTAL = "ORDER_TOTAL",
    SPECIFIC_PROD = "SPECIFIC_PROD",
    CATEGORY = "CATEGORY"
}
export declare enum DiscountConditionType {
    NONE = "NONE",
    MIN_QUANTITY = "MIN_QUANTITY",
    MIN_AMOUNT = "MIN_AMOUNT"
}
export declare enum DiscountTriggerType {
    MANUAL = "MANUAL",
    AUTO = "AUTO"
}
//# sourceMappingURL=index.d.ts.map