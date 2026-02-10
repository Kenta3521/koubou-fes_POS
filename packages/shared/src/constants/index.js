// Enum definitions from DB設計書.md
export const Role = {
    ADMIN: 'ADMIN',
    STAFF: 'STAFF',
    PENDING: 'PENDING',
    TMP: 'TMP',
};
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["DEACTIVATED"] = "DEACTIVATED";
})(UserStatus || (UserStatus = {}));
export var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
    TransactionStatus["REFUNDED"] = "REFUNDED";
})(TransactionStatus || (TransactionStatus = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["PAYPAY"] = "PAYPAY";
})(PaymentMethod || (PaymentMethod = {}));
export var StockChangeReason;
(function (StockChangeReason) {
    StockChangeReason["SALE"] = "SALE";
    StockChangeReason["REPLENISH"] = "REPLENISH";
    StockChangeReason["ADJUSTMENT"] = "ADJUSTMENT";
    StockChangeReason["RETURN"] = "RETURN";
})(StockChangeReason || (StockChangeReason = {}));
export var DiscountType;
(function (DiscountType) {
    DiscountType["FIXED"] = "FIXED";
    DiscountType["PERCENT"] = "PERCENT";
})(DiscountType || (DiscountType = {}));
export var DiscountTargetType;
(function (DiscountTargetType) {
    DiscountTargetType["ORDER_TOTAL"] = "ORDER_TOTAL";
    DiscountTargetType["SPECIFIC_PROD"] = "SPECIFIC_PROD";
    DiscountTargetType["CATEGORY"] = "CATEGORY";
})(DiscountTargetType || (DiscountTargetType = {}));
export var DiscountConditionType;
(function (DiscountConditionType) {
    DiscountConditionType["NONE"] = "NONE";
    DiscountConditionType["MIN_QUANTITY"] = "MIN_QUANTITY";
    DiscountConditionType["MIN_AMOUNT"] = "MIN_AMOUNT";
})(DiscountConditionType || (DiscountConditionType = {}));
export var DiscountTriggerType;
(function (DiscountTriggerType) {
    DiscountTriggerType["MANUAL"] = "MANUAL";
    DiscountTriggerType["AUTO"] = "AUTO";
})(DiscountTriggerType || (DiscountTriggerType = {}));
//# sourceMappingURL=index.js.map