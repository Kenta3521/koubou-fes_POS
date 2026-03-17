import SwiftUI
import SwiftData

struct POSTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AuthViewModel.self) private var authVM
    @State private var posViewModel = POSViewModel()

    var body: some View {
        @Bindable var vm = posViewModel
        TabView {
            NavigationStack(path: $vm.navigationPath) {
                OrderInputView(orgId: authVM.selectedOrganization?.id ?? "")
                    .navigationDestination(for: POSDestination.self) { destination in
                        switch destination {
                        case .orderConfirm:
                            OrderConfirmView(orgId: posViewModel.currentOrgId)
                        case .cashPayment:
                            CashPaymentView(orgId: posViewModel.currentOrgId)
                        case .payPayPayment:
                            PayPayPaymentView(orgId: posViewModel.currentOrgId)
                        case .paymentComplete(let transactionId, let paymentMethod, let receivedAmount):
                            PaymentCompleteView(transactionId: transactionId, paymentMethod: paymentMethod, receivedAmount: receivedAmount)
                        }
                    }
            }
            .tabItem {
                Label("レジ", systemImage: "cart")
            }

            TransactionListView(orgId: authVM.selectedOrganization?.id ?? "")
            .tabItem {
                Label("履歴", systemImage: "clock")
            }
            // iOS-3: 設定タブを追加予定
        }
        .environment(posViewModel)
        .task {
            // iOS-2-001 完了条件: 起動時にキャッシュを更新する（仕様書 §4.5）
            guard let orgId = authVM.selectedOrganization?.id else { return }
            posViewModel.currentOrgId = orgId
            try? await ProductService.shared.refreshAllCache(
                for: orgId,
                modelContainer: modelContext.container
            )
        }
    }
}

#Preview {
    POSTabView()
        .environment(AuthViewModel())
}
