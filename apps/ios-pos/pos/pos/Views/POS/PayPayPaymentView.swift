import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins

// MARK: - 画面状態

private enum PayPayViewState: Equatable {
    case creating           // トランザクション作成 + QR生成中
    case waiting            // QR表示・ポーリング中
    case completed          // 決済完了
    case timedOut           // タイムアウト
    case error(String)      // エラー
}

// MARK: - PayPayPaymentView

struct PayPayPaymentView: View {
    let orgId: String
    @Environment(POSViewModel.self) private var posVM

    @State private var viewState: PayPayViewState = .creating
    @State private var transactionId: String? = nil
    @State private var qrContent: String = ""       // QRに埋め込む文字列（deepLink）
    @State private var remainingSeconds: Int = 180
    @State private var isCancelling = false
    @State private var pollingTask: Task<Void, Never>? = nil
    @State private var timerTask: Task<Void, Never>? = nil

    private var totalAmount: Int {
        posVM.calculationResult?.totalAmount ?? posVM.subtotalPrice
    }

    // タイマー表示（mm:ss）
    private var timerLabel: String {
        let m = remainingSeconds / 60
        let s = remainingSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            Color(.systemGroupedBackground).ignoresSafeArea()

            switch viewState {
            case .creating:
                creatingView
            case .waiting:
                waitingView
            case .completed:
                completedView
            case .timedOut:
                timedOutView
            case .error(let msg):
                errorView(msg)
            }
        }
        .navigationTitle("PayPay決済")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if viewState == .waiting {
                    Button(role: .destructive) {
                        Task { await handleCancel() }
                    } label: {
                        Text("取引中止")
                            .foregroundStyle(Color.appError)
                    }
                    .disabled(isCancelling)
                }
            }
        }
        .task {
            await startPayment()
        }
        .onDisappear {
            pollingTask?.cancel()
            timerTask?.cancel()
        }
    }

    // MARK: - 画面: 準備中

    private var creatingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("PayPayを準備中...")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
        }
    }

    // MARK: - 画面: QR表示・待受中

    private var waitingView: some View {
        ScrollView {
            VStack(spacing: 0) {
                // ── カスタマー側（QR + 金額）──────────────────
                VStack(spacing: 16) {
                    // 金額
                    VStack(spacing: 4) {
                        Text("お支払い金額")
                            .font(.subheadline)
                            .foregroundStyle(Color.secondary)
                        Text("¥\(totalAmount.formatted())")
                            .font(.system(size: 44, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.primary)
                    }
                    .padding(.top, 24)

                    // QRコード
                    ZStack {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.white)
                            .shadow(color: .black.opacity(0.12), radius: 12, x: 0, y: 4)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .strokeBorder(Color(red: 1.0, green: 0.2, blue: 0.2), lineWidth: 4)
                            )

                        if let qrImage = generateQRCode(from: qrContent) {
                            Image(uiImage: qrImage)
                                .interpolation(.none)
                                .resizable()
                                .scaledToFit()
                                .frame(width: 220, height: 220)
                                .padding(20)
                        } else {
                            Image(systemName: "qrcode")
                                .font(.system(size: 120))
                                .foregroundStyle(Color.primary)
                                .padding(20)
                        }
                    }
                    .frame(width: 280, height: 280)

                    Text("PayPayでスキャンしてください")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color(red: 1.0, green: 0.2, blue: 0.2))
                        .padding(.bottom, 24)
                }
                .frame(maxWidth: .infinity)
                .background(Color(.secondarySystemGroupedBackground))

                Divider()

                // ── スタッフ側（タイマー・ステータス）──────────
                VStack(spacing: 16) {
                    // タイマー + Transaction ID
                    HStack {
                        HStack(spacing: 6) {
                            Image(systemName: "clock")
                                .foregroundStyle(Color.secondary)
                            Text("有効期限")
                                .font(.subheadline)
                                .foregroundStyle(Color.secondary)
                            Text(timerLabel)
                                .font(.system(size: 22, weight: .bold, design: .monospaced))
                                .foregroundStyle(remainingSeconds < 60 ? Color.appError : Color.primary)
                                .opacity(remainingSeconds < 60 ? 1.0 : 1.0)
                                .animation(
                                    remainingSeconds < 60
                                        ? .easeInOut(duration: 0.5).repeatForever(autoreverses: true)
                                        : .default,
                                    value: remainingSeconds
                                )
                        }
                        Spacer()
                        if let txnId = transactionId {
                            Text(String(txnId.prefix(8)))
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundStyle(Color.secondary)
                        }
                    }

                    // ステータスカード
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("お預かり金額（PayPay）")
                                .font(.caption)
                                .foregroundStyle(Color.secondary)
                            Text("¥\(totalAmount.formatted())")
                                .font(.title3.bold())
                        }
                        Spacer()
                        // 決済待受中バッジ
                        HStack(spacing: 6) {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(Color(red: 1.0, green: 0.2, blue: 0.2))
                            Text("決済待受中")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color(red: 1.0, green: 0.2, blue: 0.2))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(red: 1.0, green: 0.2, blue: 0.2).opacity(0.1))
                        .clipShape(Capsule())
                    }
                    .padding(16)
                    .background(Color.white.opacity(0.8))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(16)
            }
        }
        .accessibilityLabel("PayPay決済待受中。QRコードをスキャンしてください。残り\(timerLabel)")
    }

    // MARK: - 画面: 決済完了

    private var completedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color.appSuccess)
            Text("決済が完了しました")
                .font(.title2.bold())
            Text("¥\(totalAmount.formatted())")
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(Color.primary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - 画面: タイムアウト

    private var timedOutView: some View {
        VStack(spacing: 20) {
            Image(systemName: "clock.badge.xmark")
                .font(.system(size: 64))
                .foregroundStyle(Color.appError)
            Text("タイムアウトしました")
                .font(.title2.bold())
            Text("決済がキャンセルされました")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
            Button("商品選択に戻る") {
                resetAndGoHome()
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.appPrimary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - 画面: エラー

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.appError)
            Text("エラーが発生しました")
                .font(.title2.bold())
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("注文確認に戻る") {
                posVM.navigationPath.removeLast()
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.appPrimary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - 決済フロー開始

    private func startPayment() async {
        do {
            // Step 1: トランザクション作成
            let items = posVM.cartItems.map {
                CreateTransactionRequestItem(productId: $0.productId, quantity: $0.quantity)
            }
            let txn = try await TransactionService.shared.createTransaction(
                orgId: orgId,
                items: items,
                paymentMethod: "PAYPAY",
                manualDiscountId: posVM.selectedManualDiscountId
            )
            transactionId = txn.id

            // Step 2: PayPay QR 生成
            let paypay = try await TransactionService.shared.createPayPayQR(
                orgId: orgId,
                transactionId: txn.id
            )
            qrContent = paypay.deepLink.isEmpty ? paypay.qrCodeUrl : paypay.deepLink
            viewState = .waiting

            // Step 3: タイマー + ポーリング 並行起動
            startTimer()
            startPolling(transactionId: txn.id)

        } catch {
            viewState = .error(error.localizedDescription)
        }
    }

    // MARK: - タイマー（180秒カウントダウン）

    private func startTimer() {
        timerTask = Task {
            while remainingSeconds > 0 {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                remainingSeconds -= 1
            }
            guard !Task.isCancelled else { return }
            await handleTimeout()
        }
    }

    // MARK: - ポーリング（5秒間隔）

    private func startPolling(transactionId: String) {
        pollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(5))
                guard !Task.isCancelled else { return }

                guard let status = try? await TransactionService.shared.checkPayPayStatus(
                    orgId: orgId,
                    transactionId: transactionId
                ) else { continue }

                let isCompleted = status.status == "COMPLETED"
                    || status.paypayStatus == "COMPLETED"
                    || status.paypayStatus == "SUCCESS"

                if isCompleted {
                    pollingTask?.cancel()
                    timerTask?.cancel()
                    await handleCompleted()
                    return
                }
            }
        }
    }

    // MARK: - イベントハンドラ

    @MainActor
    private func handleCompleted() async {
        viewState = .completed
        try? await Task.sleep(for: .seconds(1.0))
        if let txnId = transactionId {
            posVM.navigationPath.append(.paymentComplete(transactionId: txnId, paymentMethod: "PAYPAY", receivedAmount: nil))
        } else {
            posVM.completeOrder()
        }
    }

    @MainActor
    private func handleTimeout() async {
        pollingTask?.cancel()
        viewState = .timedOut
        if let txnId = transactionId {
            try? await TransactionService.shared.cancelTransaction(orgId: orgId, transactionId: txnId)
        }
    }

    private func handleCancel() async {
        guard let txnId = transactionId else {
            resetAndGoHome()
            return
        }
        isCancelling = true
        pollingTask?.cancel()
        timerTask?.cancel()
        try? await TransactionService.shared.cancelTransaction(orgId: orgId, transactionId: txnId)
        resetAndGoHome()
    }

    private func resetAndGoHome() {
        posVM.clearCart()
        posVM.calculationResult = nil
        posVM.selectedManualDiscountId = nil
        posVM.navigationPath.removeAll()
    }

    // MARK: - QRコード生成（CoreImage）

    private func generateQRCode(from string: String) -> UIImage? {
        guard !string.isEmpty,
              let data = string.data(using: .utf8) else { return nil }
        let filter = CIFilter.qrCodeGenerator()
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

#Preview {
    NavigationStack {
        PayPayPaymentView(orgId: "preview-org")
    }
    .environment({
        let vm = POSViewModel()
        vm.cartItems = [
            CartItem(productId: "1", name: "たこ焼き", price: 600, discountedPrice: nil, quantity: 2)
        ]
        return vm
    }())
}
