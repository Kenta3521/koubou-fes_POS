import SwiftUI
import SwiftData

struct POSTabView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AuthViewModel.self) private var authVM
    @State private var posViewModel = POSViewModel()

    @AppStorage(Constants.UserDefaultsKeys.ttpSplashDismissed)
    private var ttpSplashDismissed = false

    @State private var showTTPSplash = false
    @State private var selectedTab: Int = 0
    @State private var historyRefreshToken = UUID()
    @State private var productRefreshToken = UUID()

    var body: some View {
        @Bindable var vm = posViewModel
        TabView(selection: $selectedTab) {
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
            .tag(0)

            TransactionListView(orgId: authVM.selectedOrganization?.id ?? "", refreshToken: historyRefreshToken)
            .tabItem {
                Label("履歴", systemImage: "clock")
            }
            .tag(1)

            SettingsView()
                .tabItem {
                    Label("設定", systemImage: "gearshape")
                }
                .tag(2)
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
        .onChange(of: selectedTab) { _, newTab in
            guard let orgId = authVM.selectedOrganization?.id else { return }
            switch newTab {
            case 0:
                // レジタブ: 商品キャッシュを再取得
                Task {
                    try? await ProductService.shared.refreshAllCache(
                        for: orgId,
                        modelContainer: modelContext.container
                    )
                }
            case 1:
                // 履歴タブ: 取引履歴を再取得
                historyRefreshToken = UUID()
            default:
                break
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
