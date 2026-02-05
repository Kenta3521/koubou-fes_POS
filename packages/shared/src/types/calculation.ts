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
    unitPrice: number; // Discounted price
    discountAmount: number; // originalPrice - unitPrice
    appliedDiscount: DiscountSummary | null;
}

export interface CalculationResult {
    totalAmount: number; // Final total to pay
    subtotalAmount: number; // Sum of original prices
    totalDiscountAmount: number; // Total saved
    items: CalculatedItem[];
    appliedOrderDiscount: DiscountSummary | null;
}
