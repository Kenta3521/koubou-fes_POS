export interface SuccessResponse<T> {
    success: true;
    data: T;
}
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
}
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
export declare const ErrorCodes: {
    readonly AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS";
    readonly AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED";
    readonly AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED";
    readonly AUTH_FORBIDDEN: "AUTH_FORBIDDEN";
    readonly USER_SUSPENDED: "USER_SUSPENDED";
    readonly USER_DEACTIVATED: "USER_DEACTIVATED";
    readonly ORG_NOT_FOUND: "ORG_NOT_FOUND";
    readonly ORG_INACTIVE: "ORG_INACTIVE";
    readonly ORG_INVALID_INVITE_CODE: "ORG_INVALID_INVITE_CODE";
    readonly PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND";
    readonly PRODUCT_SOLD_OUT: "PRODUCT_SOLD_OUT";
    readonly PRODUCT_INSUFFICIENT_STOCK: "PRODUCT_INSUFFICIENT_STOCK";
    readonly CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND";
    readonly DISCOUNT_NOT_FOUND: "DISCOUNT_NOT_FOUND";
    readonly DISCOUNT_INACTIVE: "DISCOUNT_INACTIVE";
    readonly TXN_NOT_FOUND: "TXN_NOT_FOUND";
    readonly TXN_ALREADY_COMPLETED: "TXN_ALREADY_COMPLETED";
    readonly TXN_CANNOT_REFUND: "TXN_CANNOT_REFUND";
    readonly PAYPAY_CREATE_FAILED: "PAYPAY_CREATE_FAILED";
    readonly PAYPAY_TIMEOUT: "PAYPAY_TIMEOUT";
    readonly PAYPAY_REFUND_FAILED: "PAYPAY_REFUND_FAILED";
    readonly SYSTEM_DISABLED: "SYSTEM_DISABLED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
//# sourceMappingURL=api.d.ts.map