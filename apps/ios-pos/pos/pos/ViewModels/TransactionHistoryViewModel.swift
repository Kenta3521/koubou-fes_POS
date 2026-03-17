import Foundation

@MainActor
@Observable
final class TransactionHistoryViewModel {

    var transactions: [TransactionSummary] = []
    var isLoading = false
    var errorMessage: String? = nil

    // MARK: - フィルタ状態

    var statusFilter: String = "ALL"          // "ALL" | "COMPLETED" | "CANCELLED" | "PENDING"
    var paymentMethodFilter: String = "ALL"   // "ALL" | "CASH" | "PAYPAY"
    var dateFilter: Date? = nil               // nil = 日付絞り込みなし

    // MARK: - データ取得

    func fetchTransactions(orgId: String) async {
        guard !orgId.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        do {
            transactions = try await TransactionService.shared.fetchTransactions(
                orgId: orgId,
                status: statusFilter == "ALL" ? nil : statusFilter,
                paymentMethod: paymentMethodFilter == "ALL" ? nil : paymentMethodFilter,
                date: dateFilter
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func resetFilters() {
        statusFilter = "ALL"
        paymentMethodFilter = "ALL"
        dateFilter = nil
    }
}
