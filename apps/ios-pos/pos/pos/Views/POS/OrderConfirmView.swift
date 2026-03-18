import SwiftUI
import SwiftData

struct OrderConfirmView: View {
    let orgId: String
    @Environment(POSViewModel.self) private var posVM
    @Environment(AuthViewModel.self) private var authVM
    @Environment(\.modelContext) private var modelContext
    @Query private var manualDiscounts: [CachedDiscount]
    @State private var isDiscountSheetPresented = false
    @State private var isRefreshingDiscounts = false
    @State private var isRecalculating = false
    @State private var paymentError: String?

    init(orgId: String) {
        self.orgId = orgId
        _manualDiscounts = Query(
            filter: #Predicate<CachedDiscount> {
                $0.organizationId == orgId
                && $0.isActive
                && $0.triggerType == "MANUAL"
            }
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    orderItemsSection
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)
            }

            VStack(spacing: 12) {
                summarySection
                if !manualDiscounts.isEmpty {
                    discountButton
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemGroupedBackground))
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("注文確認")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            paymentButtonsSection
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .background(.ultraThinMaterial)
        }
        .task {
            await posVM.fetchCalculation(orgId: orgId)
        }
        .alert("エラー", isPresented: .init(
            get: { paymentError != nil },
            set: { if !$0 { paymentError = nil } }
        )) {
            Button("商品選択に戻る") {
                paymentError = nil
                posVM.calculationResult = nil
                posVM.navigationPath.removeAll()
            }
        } message: {
            Text(paymentError ?? "")
        }
        .sheet(isPresented: $isDiscountSheetPresented) {
            DiscountSheetView(
                discounts: manualDiscounts,
                selectedDiscountId: posVM.selectedManualDiscountId,
                currentTotal: posVM.calculationResult?.subtotalAmount ?? posVM.subtotalPrice
            ) { discountId in
                Task { await posVM.setManualDiscount(discountId, orgId: orgId) }
            }
        }
    }

    // MARK: - 注文内容

    private var orderItemsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("注文内容")
                .font(.headline)
                .padding(.bottom, 12)

            if posVM.isCalculating && posVM.calculationResult == nil {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 24)
            } else if let result = posVM.calculationResult {
                ForEach(Array(result.items.enumerated()), id: \.element.productId) { index, item in
                    if index > 0 { Divider() }
                    ConfirmedItemRow(item: item)
                }
            } else {
                ForEach(Array(posVM.cartItems.enumerated()), id: \.element.id) { index, item in
                    if index > 0 { Divider() }
                    CartFallbackRow(item: item)
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - 合計

    private var summarySection: some View {
        VStack(spacing: 10) {
            if let result = posVM.calculationResult {
                HStack {
                    Text("小計（\(posVM.totalItemCount)点）")
                        .font(.subheadline)
                        .foregroundStyle(Color.secondary)
                    Spacer()
                    Text("¥\(result.subtotalAmount.formatted())")
                        .font(.subheadline.bold())
                }
                if result.totalDiscountAmount > 0 {
                    // 割引合計
                    HStack {
                        Text("割引合計")
                            .font(.subheadline)
                            .foregroundStyle(Color.appSuccess)
                        Spacer()
                        Text("−¥\(result.totalDiscountAmount.formatted())")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.appSuccess)
                    }
                    // 割引内訳（web版同様：左ボーダー付きリスト）
                    let breakdown = discountBreakdown(from: result)
                    if !breakdown.isEmpty {
                        HStack(spacing: 0) {
                            Rectangle()
                                .fill(Color.appSuccess.opacity(0.4))
                                .frame(width: 2)
                                .padding(.leading, 6)
                            VStack(alignment: .leading, spacing: 3) {
                                ForEach(breakdown, id: \.name) { entry in
                                    HStack {
                                        Text("• \(entry.name)")
                                            .font(.caption)
                                            .foregroundStyle(Color.appSuccess)
                                        Spacer()
                                        Text("−¥\(entry.amount.formatted())")
                                            .font(.caption)
                                            .foregroundStyle(Color.appSuccess)
                                    }
                                }
                            }
                            .padding(.leading, 8)
                        }
                    }
                }
                Divider()
                HStack {
                    Text("合計")
                        .font(.headline)
                    Spacer()
                    if posVM.isCalculating {
                        ProgressView().scaleEffect(0.8)
                    } else {
                        Text("¥\(result.totalAmount.formatted())")
                            .font(.title2.bold())
                            .foregroundStyle(Color.primary)
                    }
                }
            } else {
                HStack {
                    Text("小計（\(posVM.totalItemCount)点）")
                        .font(.subheadline)
                        .foregroundStyle(Color.secondary)
                    Spacer()
                    Text("¥\(posVM.subtotalPrice.formatted())")
                        .font(.subheadline.bold())
                }
                Divider()
                HStack {
                    Text("合計")
                        .font(.headline)
                    Spacer()
                    if posVM.isCalculating {
                        ProgressView().scaleEffect(0.8)
                    } else {
                        Text("計算中...")
                            .font(.subheadline)
                            .foregroundStyle(Color.secondary)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    /// web版 getDiscountBreakdown() と同じロジックで割引内訳を集計する
    private func discountBreakdown(from result: CalculationResult) -> [(name: String, amount: Int)] {
        var map: [(id: String, name: String, amount: Int)] = []

        // アイテムレベルの割引を集計
        for item in result.items where item.discountAmount > 0 {
            guard let d = item.appliedDiscount else { continue }
            if let idx = map.firstIndex(where: { $0.id == d.id }) {
                map[idx].amount += item.discountAmount * item.quantity
            } else {
                map.append((id: d.id, name: d.name, amount: item.discountAmount * item.quantity))
            }
        }

        // オーダーレベルの割引を追加
        if let orderDiscount = result.appliedOrderDiscount {
            let itemDiscountTotal = result.items.reduce(0) { $0 + $1.discountAmount * $1.quantity }
            let orderDiscountAmount = result.totalDiscountAmount - itemDiscountTotal
            if orderDiscountAmount > 0 {
                if let idx = map.firstIndex(where: { $0.id == orderDiscount.id }) {
                    map[idx].amount += orderDiscountAmount
                } else {
                    map.append((id: orderDiscount.id, name: orderDiscount.name, amount: orderDiscountAmount))
                }
            }
        }

        return map.map { (name: $0.name, amount: $0.amount) }
    }

    // MARK: - 割引ボタン

    private var discountButton: some View {
        Button {
            Task {
                isRefreshingDiscounts = true
                try? await ProductService.shared.refreshDiscountsCache(
                    for: orgId,
                    modelContainer: modelContext.container
                )
                isRefreshingDiscounts = false
                isDiscountSheetPresented = true
            }
        } label: {
            Group {
                if isRefreshingDiscounts {
                    ProgressView().progressViewStyle(.circular).scaleEffect(0.8)
                } else {
                    Label(
                        posVM.selectedManualDiscountId == nil ? "割引を適用" : "割引を変更",
                        systemImage: "tag"
                    )
                }
            }
            .font(.subheadline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .foregroundStyle(Color.primary)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color(.systemGray4), lineWidth: 1)
            )
        }
        .disabled(isRefreshingDiscounts)
        .accessibilityLabel(posVM.selectedManualDiscountId == nil ? "割引を適用" : "割引を変更")
    }

    // MARK: - 支払方法

    private var paymentButtonsSection: some View {
        VStack(spacing: 12) {
            Text("お支払い方法")
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            let totalAmount = posVM.calculationResult?.totalAmount ?? 0
            let isCalculationReady = posVM.calculationResult != nil && !posVM.isCalculating && !isRecalculating
            let isNonZero = totalAmount > 0

            // タップ決済（Apple 要件 5.2: 最上部配置）
            // 権限がないユーザー、または設定で無効化している場合はボタンを非表示
            if authVM.hasTapToPayPermission,
               case .connected = TapToPayService.shared.connectionStatus {
                PaymentMethodButton(
                    title: "iPhoneのタッチ決済",
                    symbolName: "wave.3.right.circle.fill",
                    color: Color(red: 0.0, green: 0.478, blue: 1.0),
                    isEnabled: isCalculationReady && isNonZero && !posVM.isTapToPayDisabled
                ) {
                    Task { await recalculateAndNavigate(to: .tapToPayPayment) }
                }
            }

            // 現金
            PaymentMethodButton(
                title: "現金",
                symbolName: "yensign.circle.fill",
                color: Color.appSuccess,
                isEnabled: isCalculationReady
            ) {
                Task { await recalculateAndNavigate(to: .cashPayment) }
            }

            // PayPay
            PaymentMethodButton(
                title: "PayPay",
                symbolName: "qrcode",
                color: Color(red: 1.0, green: 0.2, blue: 0.2),  // PayPay red
                isEnabled: isCalculationReady && isNonZero
            ) {
                Task { await recalculateAndNavigate(to: .payPayPayment) }
            }

            if isRecalculating {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
    }

    // MARK: - 支払い前の再計算バリデーション

    private func recalculateAndNavigate(to destination: POSDestination) async {
        isRecalculating = true
        let items = posVM.cartItems.map {
            CalculationRequestItem(productId: $0.productId, quantity: $0.quantity)
        }
        do {
            posVM.calculationResult = try await ProductService.shared.calculate(
                orgId: orgId,
                items: items,
                manualDiscountId: posVM.selectedManualDiscountId
            )
            isRecalculating = false
            posVM.navigationPath.append(destination)
        } catch {
            isRecalculating = false
            let message = error.localizedDescription
            if message.contains("INSUFFICIENT_STOCK") {
                paymentError = "在庫が不足している商品が含まれています。商品選択画面からやり直してください。"
            } else {
                paymentError = "注文の確認中にエラーが発生しました。商品選択画面からやり直してください。"
            }
        }
    }
}

// MARK: - ConfirmedItemRow

private struct ConfirmedItemRow: View {
    let item: CalculatedItem

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.productName)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                if item.discountAmount > 0 {
                    HStack(spacing: 6) {
                        Text("¥\(item.originalPrice.formatted())")
                            .font(.caption)
                            .strikethrough(true, color: .secondary)
                            .foregroundStyle(Color.secondary)
                        Text("¥\(item.unitPrice.formatted())")
                            .font(.caption.bold())
                            .foregroundStyle(Color.appSuccess)
                        Text("× \(item.quantity)")
                            .font(.caption)
                            .foregroundStyle(Color.secondary)
                    }
                } else {
                    Text("¥\(item.unitPrice.formatted()) × \(item.quantity)")
                        .font(.caption)
                        .foregroundStyle(Color.secondary)
                }
            }
            Spacer()
            Text("¥\((item.unitPrice * item.quantity).formatted())")
                .font(.subheadline.bold())
        }
        .padding(.vertical, 8)
    }
}

// MARK: - CartFallbackRow

private struct CartFallbackRow: View {
    let item: CartItem

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(1)
                Text("¥\(item.effectivePrice.formatted()) × \(item.quantity)")
                    .font(.caption)
                    .foregroundStyle(Color.secondary)
            }
            Spacer()
            Text("¥\((item.effectivePrice * item.quantity).formatted())")
                .font(.subheadline.bold())
        }
        .padding(.vertical, 8)
    }
}

// MARK: - PaymentMethodButton

private struct PaymentMethodButton: View {
    let title: String
    let symbolName: String
    let color: Color
    var isEnabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title)
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                HStack {
                    Image(systemName: symbolName)
                        .font(.title2.weight(.semibold))
                        .frame(width: 28)
                    Spacer()
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(!isEnabled)
        .opacity(isEnabled ? 1.0 : 0.5)
        .accessibilityLabel(title)
        .accessibilityHint(isEnabled ? "\(title)で支払う" : "計算が完了するまで待ってください")
    }
}

#Preview {
    NavigationStack {
        OrderConfirmView(orgId: "preview-org")
    }
    .environment({
        let vm = POSViewModel()
        vm.cartItems = [
            CartItem(productId: "1", name: "たこ焼き", price: 600, discountedPrice: nil, quantity: 2),
            CartItem(productId: "2", name: "焼きそば", price: 400, discountedPrice: 360, quantity: 1)
        ]
        return vm
    }())
}
