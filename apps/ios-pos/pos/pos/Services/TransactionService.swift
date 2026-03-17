import Foundation

final class TransactionService {
    static let shared = TransactionService()
    private init() {}

    /// カート内容からトランザクションを作成する（PENDING 状態）
    func createTransaction(
        orgId: String,
        items: [CreateTransactionRequestItem],
        paymentMethod: String,
        manualDiscountId: String? = nil
    ) async throws -> CreateTransactionResponse {
        let body = CreateTransactionRequest(
            items: items,
            paymentMethod: paymentMethod,
            manualDiscountId: manualDiscountId
        )
        return try await APIClient.shared.request(
            .post,
            path: "/organizations/\(orgId)/transactions",
            body: body
        )
    }

    /// PayPay QRコードを生成する
    func createPayPayQR(orgId: String, transactionId: String) async throws -> CreatePayPayResponse {
        return try await APIClient.shared.request(
            .post,
            path: "/organizations/\(orgId)/transactions/\(transactionId)/paypay/create"
        )
    }

    /// PayPay 決済ステータスを確認する（ポーリング用）
    func checkPayPayStatus(orgId: String, transactionId: String) async throws -> PayPayStatusResponse {
        return try await APIClient.shared.request(
            .get,
            path: "/organizations/\(orgId)/transactions/\(transactionId)/paypay/status"
        )
    }

    /// トランザクションをキャンセルする
    func cancelTransaction(orgId: String, transactionId: String) async throws -> CancelTransactionResponse {
        return try await APIClient.shared.request(
            .post,
            path: "/organizations/\(orgId)/transactions/\(transactionId)/cancel"
        )
    }

    /// 取引一覧を取得する（最大100件）
    func fetchTransactions(
        orgId: String,
        status: String? = nil,
        paymentMethod: String? = nil,
        date: Date? = nil
    ) async throws -> [TransactionSummary] {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "limit", value: "100"),
            URLQueryItem(name: "page", value: "1")
        ]
        if let status { queryItems.append(URLQueryItem(name: "status", value: status)) }
        if let paymentMethod { queryItems.append(URLQueryItem(name: "paymentMethod", value: paymentMethod)) }
        if let date {
            let formatter = ISO8601DateFormatter()
            let start = Calendar.current.startOfDay(for: date)
            let end = start.addingTimeInterval(86399)
            queryItems.append(URLQueryItem(name: "startDate", value: formatter.string(from: start)))
            queryItems.append(URLQueryItem(name: "endDate", value: formatter.string(from: end)))
        }
        return try await APIClient.shared.request(
            .get,
            path: "/organizations/\(orgId)/transactions",
            queryItems: queryItems
        )
    }

    /// 取引詳細を取得する
    func fetchTransactionDetail(orgId: String, transactionId: String) async throws -> TransactionDetail {
        return try await APIClient.shared.request(
            .get,
            path: "/organizations/\(orgId)/transactions/\(transactionId)"
        )
    }

    /// 現金決済を完了する（在庫減算・ステータス COMPLETED）
    func completeCash(
        orgId: String,
        transactionId: String,
        receivedAmount: Int
    ) async throws -> CompleteCashResponse {
        let body = CompleteCashRequest(receivedAmount: receivedAmount)
        return try await APIClient.shared.request(
            .post,
            path: "/organizations/\(orgId)/transactions/\(transactionId)/complete-cash",
            body: body
        )
    }
}
