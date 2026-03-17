import Foundation

// MARK: - /calculate リクエスト

struct CalculationRequest: Encodable {
    let items: [CalculationRequestItem]
    let manualDiscountId: String?
}

struct CalculationRequestItem: Encodable {
    let productId: String
    let quantity: Int
}

// MARK: - /calculate レスポンス

struct CalculationResult: Decodable {
    let totalAmount: Int
    let subtotalAmount: Int
    let totalDiscountAmount: Int
    let items: [CalculatedItem]
    let appliedOrderDiscount: CalculationDiscount?
}

struct CalculatedItem: Decodable {
    let productId: String
    let productName: String
    let quantity: Int
    let originalPrice: Int
    let unitPrice: Int
    let discountAmount: Int
    let appliedDiscount: CalculationDiscount?
}

struct CalculationDiscount: Decodable {
    let id: String
    let name: String
    let type: String
    let value: Int
}

// MARK: - トランザクション作成リクエスト

struct CreateTransactionRequest: Encodable {
    let items: [CreateTransactionRequestItem]
    let paymentMethod: String
    let manualDiscountId: String?
}

struct CreateTransactionRequestItem: Encodable {
    let productId: String
    let quantity: Int
}

// MARK: - トランザクション作成レスポンス

struct CreateTransactionResponse: Decodable {
    let id: String
    let status: String
    let totalAmount: Int
}

// MARK: - 現金決済完了リクエスト / レスポンス

struct CompleteCashRequest: Encodable {
    let receivedAmount: Int
}

struct CompleteCashResponse: Decodable {
    let id: String
    let status: String
    let totalAmount: Int
}

// MARK: - PayPay QRコード作成レスポンス

struct CreatePayPayResponse: Decodable {
    let qrCodeUrl: String
    let deepLink: String
    // expiresAt は PayPay SDK が Int で返すが iOS では独自 180 秒タイマーを使うため省略
    let merchantPaymentId: String
}

// MARK: - PayPay 決済ステータスレスポンス

struct PayPayStatusResponse: Decodable {
    let status: String          // "PENDING" | "COMPLETED" | "CANCELLED"
    let paypayStatus: String    // "PENDING" | "COMPLETED" | "SUCCESS"
    let synced: Bool
}

// MARK: - トランザクションキャンセルレスポンス

struct CancelTransactionResponse: Decodable {
    let id: String
    let status: String
}

// MARK: - 取引履歴 DTO

struct TransactionSummary: Decodable, Identifiable {
    let id: String
    let totalAmount: Int
    let discountAmount: Int
    let paymentMethod: String
    let status: String
    let createdAt: String
    let user: TransactionUser
}

struct TransactionUser: Decodable {
    let name: String
}

struct TransactionDetail: Decodable, Identifiable {
    let id: String
    let totalAmount: Int
    let discountAmount: Int
    let paymentMethod: String
    let status: String
    let createdAt: String
    let user: TransactionUserDetail
    let items: [TransactionHistoryItem]
    let discount: TransactionAppliedDiscount?   // order-level 割引
}

struct TransactionUserDetail: Decodable {
    let name: String
    let email: String
}

struct TransactionHistoryItem: Decodable, Identifiable {
    let id: String
    let product: TransactionItemProduct   // API は product.name で返す
    let quantity: Int
    let unitPrice: Int
    let originalPrice: Int
    let discountAmount: Int
    let discount: TransactionAppliedDiscount?   // item-level 割引
}

struct TransactionItemProduct: Decodable {
    let name: String
}

struct TransactionAppliedDiscount: Decodable {
    let id: String
    let name: String
    let type: String
    let value: Int
}
