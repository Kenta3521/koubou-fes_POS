import SwiftUI

struct CashPaymentView: View {
    let orgId: String
    @Environment(POSViewModel.self) private var posVM

    /// 入力中の数字列（"0"始まり防止は入力時に制御）
    @State private var inputDigits: String = ""
    @State private var isProcessing = false
    @State private var errorMessage: String? = nil

    private var totalAmount: Int {
        posVM.calculationResult?.totalAmount ?? posVM.subtotalPrice
    }

    private var receivedAmount: Int {
        Int(inputDigits) ?? 0
    }

    private var changeAmount: Int {
        receivedAmount - totalAmount
    }

    private var canComplete: Bool {
        !isProcessing
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    totalCard
                    receivedAndChangeRow
                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(Color.appError)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 4)
                    }
                }
                .padding(16)
            }

            Divider()
            numpad
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .background(Color(.systemGroupedBackground))
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("現金会計")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(role: .destructive) {
                    posVM.clearCart()
                    posVM.calculationResult = nil
                    posVM.selectedManualDiscountId = nil
                    posVM.navigationPath.removeAll()
                } label: {
                    Text("取引中止")
                        .foregroundStyle(Color.appError)
                }
                .disabled(isProcessing)
            }
        }
        .safeAreaInset(edge: .bottom) {
            completeButton
        }
    }

    // MARK: - 合計金額カード

    private var totalCard: some View {
        VStack(spacing: 6) {
            Text("合計金額")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
            Text("¥\(totalAmount.formatted())")
                .font(.system(size: 52, weight: .bold, design: .rounded))
                .foregroundStyle(Color.primary)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .accessibilityLabel("合計金額 ¥\(totalAmount.formatted())")
    }

    // MARK: - 預かり金 + お釣り（同一カード内・横並び）

    private var receivedAndChangeRow: some View {
        HStack(spacing: 0) {
            // 預かり金
            VStack(spacing: 6) {
                Text("預かり金")
                    .font(.subheadline)
                    .foregroundStyle(Color.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text("¥")
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundStyle(inputDigits.isEmpty ? Color.secondary : Color.primary)
                    Text(inputDigits.isEmpty ? "0" : receivedAmount.formatted())
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(inputDigits.isEmpty ? Color.secondary : Color.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .contentTransition(.numericText())
                        .animation(.easeInOut(duration: 0.1), value: inputDigits)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .accessibilityLabel("預かり金額 ¥\(receivedAmount.formatted())")

            Divider().frame(height: 60)

            // お釣り
            VStack(spacing: 6) {
                Text("お釣り")
                    .font(.subheadline)
                    .foregroundStyle(Color.secondary)
                if inputDigits.isEmpty {
                    Text("—")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.secondary)
                } else {
                    Text(changeAmount >= 0
                         ? "¥\(changeAmount.formatted())"
                         : "¥\(abs(changeAmount).formatted()) 不足")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(changeAmount >= 0 ? Color.appSuccess : Color.appError)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .contentTransition(.numericText())
                        .animation(.easeInOut(duration: 0.15), value: changeAmount)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .accessibilityLabel("お釣り \(inputDigits.isEmpty ? "未入力" : "¥\(changeAmount.formatted())")")
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - カスタムテンキー

    private var numpad: some View {
        VStack(spacing: 8) {
            ForEach([[1, 2, 3], [4, 5, 6], [7, 8, 9]], id: \.self) { row in
                HStack(spacing: 8) {
                    ForEach(row, id: \.self) { digit in
                        NumpadKey(label: "\(digit)") { appendDigit("\(digit)") }
                    }
                }
            }
            HStack(spacing: 8) {
                NumpadKey(label: "00") { appendDigit("00") }
                NumpadKey(label: "0") { appendDigit("0") }
                NumpadKey(label: "C", isDestructive: true) { inputDigits = "" }
            }
        }
    }

    // MARK: - テンキー入力ロジック

    private func appendDigit(_ digit: String) {
        let current = inputDigits + digit
        // 先頭の0を除去し、上限10桁（¥9,999,999,999）
        let trimmed = String(current.drop(while: { $0 == "0" }))
        guard trimmed.count <= 10 else { return }
        inputDigits = trimmed
    }

    // MARK: - 完了ボタン

    private var completeButton: some View {
        Button {
            Task { await completePayment() }
        } label: {
            Group {
                if isProcessing {
                    ProgressView().progressViewStyle(.circular).tint(.white)
                } else {
                    Label("会計を完了する", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(canComplete ? Color.appPrimary : Color(.systemGray4))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(!canComplete)
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(Color(.systemGroupedBackground))
        .accessibilityLabel("会計を完了する")
        .accessibilityHint("タップして現金決済を完了する")
    }

    // MARK: - 決済処理

    private func completePayment() async {
        guard canComplete else { return }
        isProcessing = true
        errorMessage = nil

        do {
            let items = posVM.cartItems.map {
                CreateTransactionRequestItem(productId: $0.productId, quantity: $0.quantity)
            }
            let txn = try await TransactionService.shared.createTransaction(
                orgId: orgId,
                items: items,
                paymentMethod: "CASH",
                manualDiscountId: posVM.selectedManualDiscountId
            )
            _ = try await TransactionService.shared.completeCash(
                orgId: orgId,
                transactionId: txn.id,
                receivedAmount: receivedAmount
            )
            posVM.navigationPath.append(.paymentComplete(transactionId: txn.id, paymentMethod: "CASH", receivedAmount: receivedAmount))
        } catch {
            errorMessage = "決済に失敗しました: \(error.localizedDescription)"
            isProcessing = false
        }
    }
}

// MARK: - NumpadKey

private struct NumpadKey: View {
    let label: String
    var isDestructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.title2.weight(.medium))
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(isDestructive
                    ? Color.appError.opacity(0.1)
                    : Color(.secondarySystemGroupedBackground))
                .foregroundStyle(isDestructive ? Color.appError : Color.primary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .sensoryFeedback(.impact(weight: .light), trigger: UUID())
    }
}

#Preview {
    NavigationStack {
        CashPaymentView(orgId: "preview-org")
    }
    .environment({
        let vm = POSViewModel()
        vm.cartItems = [
            CartItem(productId: "1", name: "たこ焼き", price: 600, discountedPrice: nil, quantity: 2)
        ]
        return vm
    }())
}
