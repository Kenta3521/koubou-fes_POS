import SwiftUI
import SwiftData

struct PaymentCompleteView: View {
    let transactionId: String
    let paymentMethod: String
    let receivedAmount: Int?

    @Environment(POSViewModel.self) private var posVM
    @Environment(\.modelContext) private var modelContext

    @State private var iconScale: CGFloat = 0.3
    @State private var iconOpacity: Double = 0
    @State private var countdown: Int = 5
    @State private var autoNavTask: Task<Void, Never>? = nil

    private static let autoNavDuration = 5

    private var totalAmount: Int {
        posVM.calculationResult?.totalAmount ?? 0
    }

    /// 現金払い時のお釣り。未入力（nil）の場合は 0 を返す。PayPay等は nil（非表示）
    private var changeAmount: Int? {
        guard paymentMethod == "CASH" else { return nil }
        return max(0, (receivedAmount ?? 0) - totalAmount)
    }

    private var paymentMethodLabel: String {
        switch paymentMethod {
        case "CASH":       return "現金"
        case "PAYPAY":     return "PayPay"
        case "TAP_TO_PAY": return "タッチ決済"
        default:           return paymentMethod
        }
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            Color(.systemGroupedBackground).ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // 単一白カード
                    VStack(spacing: 0) {
                        headerSection
                        Divider()
                        itemsSection
                        Divider()
                        totalsSection
                        buttonSection
                    }
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
                    .padding(20)
                }
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .sensoryFeedback(.success, trigger: iconOpacity)
        .onAppear {
            withAnimation(.spring(duration: 0.5, bounce: 0.4)) {
                iconScale = 1.0
                iconOpacity = 1.0
            }
            startAutoNav()
        }
        .onDisappear {
            autoNavTask?.cancel()
        }
    }

    // MARK: - ヘッダー（アイコン + タイトル）

    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 72, weight: .thin))
                .foregroundStyle(Color.appSuccess)
                .scaleEffect(iconScale)
                .opacity(iconOpacity)

            Text("会計完了")
                .font(.system(size: 28, weight: .bold))
                .opacity(iconOpacity)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("会計が完了しました")
    }

    // MARK: - 明細

    private var itemsSection: some View {
        VStack(spacing: 0) {
            if let result = posVM.calculationResult {
                ForEach(Array(result.items.enumerated()), id: \.element.productId) { index, item in
                    if index > 0 { Divider().padding(.horizontal, 20) }
                    HStack(alignment: .center, spacing: 8) {
                        Text(item.productName)
                            .font(.subheadline)
                            .lineLimit(1)
                        Text("x \(item.quantity)")
                            .font(.caption)
                            .foregroundStyle(Color.secondary)
                        Spacer()
                        Text("¥\((item.unitPrice * item.quantity).formatted())")
                            .font(.subheadline.bold())
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 14)
                }
            }
        }
    }

    // MARK: - 合計・お釣り・支払方法

    private var totalsSection: some View {
        VStack(spacing: 0) {
            // 合計請求額
            HStack {
                Text("合計請求額")
                    .font(.subheadline)
                    .foregroundStyle(Color.secondary)
                Spacer()
                Text("¥\(totalAmount.formatted())")
                    .font(.system(size: 28, weight: .bold))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)

            // お釣り（現金のみ）
            if let change = changeAmount {
                HStack {
                    Text("お釣り")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.appSuccess)
                    Spacer()
                    Text("¥\(change.formatted())")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Color.appSuccess)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.appSuccess.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
                .accessibilityLabel("お釣り ¥\(change.formatted())")
            }

            // 支払方法
            HStack {
                Text("支払方法")
                    .font(.subheadline)
                    .foregroundStyle(Color.secondary)
                Spacer()
                Text(paymentMethodLabel)
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .strokeBorder(Color(.systemGray4), lineWidth: 1)
                    )
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
    }

    // MARK: - ボタン + カウントダウン

    private var buttonSection: some View {
        VStack(spacing: 8) {
            Divider()

            Button {
                autoNavTask?.cancel()
                navigateToNext()
            } label: {
                HStack(spacing: 8) {
                    Text("次の注文へ")
                        .font(.headline)
                    Image(systemName: "arrow.right")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(Color(red: 0.95, green: 0.42, blue: 0.09))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .accessibilityLabel("次の注文へ")
            .accessibilityHint("\(Self.autoNavDuration)秒後に自動的に移動します")

            Text("AUTOFORWARDING TO POS IN \(countdown)S")
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.secondary)
                .padding(.bottom, 20)
        }
    }

    // MARK: - 自動遷移

    private func startAutoNav() {
        autoNavTask = Task {
            for remaining in stride(from: Self.autoNavDuration - 1, through: 0, by: -1) {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                countdown = remaining
            }
            guard !Task.isCancelled else { return }
            navigateToNext()
        }
    }

    private func navigateToNext() {
        Task {
            posVM.completeOrder()
            guard !posVM.currentOrgId.isEmpty else { return }
            try? await ProductService.shared.refreshAllCache(
                for: posVM.currentOrgId,
                modelContainer: modelContext.container
            )
        }
    }
}

#Preview {
    NavigationStack {
        PaymentCompleteView(
            transactionId: "preview-txn",
            paymentMethod: "CASH",
            receivedAmount: 2000
        )
    }
    .environment({
        let vm = POSViewModel()
        vm.calculationResult = CalculationResult(
            totalAmount: 1150,
            subtotalAmount: 1300,
            totalDiscountAmount: 150,
            items: [
                CalculatedItem(productId: "1", productName: "焼きそば（並）", quantity: 2,
                               originalPrice: 500, unitPrice: 500, discountAmount: 0, appliedDiscount: nil),
                CalculatedItem(productId: "2", productName: "コーラ", quantity: 1,
                               originalPrice: 150, unitPrice: 150, discountAmount: 0, appliedDiscount: nil)
            ],
            appliedOrderDiscount: nil
        )
        return vm
    }())
}
