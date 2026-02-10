export interface DiscountSummary {
    id: string;
    name: string;
    type: 'FIXED' | 'PERCENT';
    value: number;
}
export interface CalculatedItem {
    productId: string;
    productName: string;
    quantity: number;
    originalPrice: number;
    unitPrice: number;
    discountAmount: number;
    appliedDiscount: DiscountSummary | null;
}
export interface CalculationResult {
    totalAmount: number;
    subtotalAmount: number;
    totalDiscountAmount: number;
    items: CalculatedItem[];
    appliedOrderDiscount: DiscountSummary | null;
}
//# sourceMappingURL=calculation.d.ts.map