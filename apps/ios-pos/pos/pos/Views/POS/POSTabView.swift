import SwiftUI
import SwiftData

struct POSTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AuthViewModel.self) private var authVM
    @State private var posViewModel = POSViewModel()

    @AppStorage(Constants.UserDefaultsKeys.ttpSplashDismissed)
    private var ttpSplashDismissed = false

    @State private var showTTPSplash = false

    var body: some View {
        @Bindable var vm = posViewModel
        TabView {
            NavigationStack(path: $vm.navigationPath) {
                OrderInputView(orgId: authVM.selectedOrganization?.id ?? "")
                    .navigationDestination(for: POSDestination.self) { destination in
                        Group {
                            switch destination {
                            case .orderConfirm:
                                OrderConfirmView(orgId: posViewModel.currentOrgId)
                            case .cashPayment:
                                CashPaymentView(orgId: posViewModel.currentOrgId)
                            case .payPayPayment:
                                PayPayPaymentView(orgId: posViewModel.currentOrgId)
                            case .tapToPayPayment:
                                TapToPayPaymentView(orgId: posViewModel.currentOrgId)
                            case .paymentComplete(let transactionId, let paymentMethod, let receivedAmount):
                                PaymentCompleteView(transactionId: transactionId, paymentMethod: paymentMethod, receivedAmount: receivedAmount)
                            }
                        }
                        .toolbar(.hidden, for: .tabBar)
                    }
            }
            .tabItem {
                Label("レジ", systemImage: "cart")
            }

            TransactionListView(orgId: authVM.selectedOrganization?.id ?? "")
            .tabItem {
                Label("履歴", systemImage: "clock")
            }

            SettingsView()
                .tabItem {
                    Label("設定", systemImage: "gearshape")
                }
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

            // iOS-3-020: カスタムスプラッシュ未表示 & 権限ありならスプラッシュ表示
            if !ttpSplashDismissed && authVM.hasTapToPayPermission {
                showTTPSplash = true
            }
        }
        .fullScreenCover(isPresented: $showTTPSplash) {
            TTPSplashView()
                .environment(authVM)
        }
    }
}

#Preview {
    POSTabView()
        .environment(AuthViewModel())
}
