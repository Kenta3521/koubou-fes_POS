import SwiftUI
import StripeTerminal

// MARK: - 画面状態

private enum TTPPaymentState: Equatable {
    case creating             // トランザクション + PaymentIntent 作成中
    case collectingPayment    // NFC リーダー UI 表示中（SDK が制御）
    case processing           // confirmPaymentIntent 実行中
    case succeeded            // 決済成功
    case cancelled            // ユーザーによる手動キャンセル
    case declined(String)     // カード拒否（理由メッセージ）
    case error(String)        // その他エラー
}

// MARK: - TapToPayPaymentView (iOS-3-031〜034, 036)

struct TapToPayPaymentView: View {
    let orgId: String
    @Environment(POSViewModel.self) private var posVM

    @State private var viewState: TTPPaymentState = .creating
    @State private var transactionId: String?
    @State private var paymentIntentId: String?
    @State private var isCancelling = false
    @State private var showInitProgress = false
    @State private var feedbackTrigger = false
    @State private var errorFeedbackTrigger = false

    private var totalAmount: Int {
        posVM.calculationResult?.totalAmount ?? posVM.subtotalPrice
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            Color(.systemGroupedBackground).ignoresSafeArea()

            switch viewState {
            case .creating:
                creatingView
            case .collectingPayment:
                collectingView
            case .processing:
                processingView
            case .succeeded:
                succeededView
            case .cancelled:
                cancelledView
            case .declined(let reason):
                declinedView(reason)
            case .error(let message):
                errorView(message)
            }
        }
        .navigationTitle("タッチ決済")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if case .creating = viewState {
                    cancelToolbarButton
                } else if case .collectingPayment = viewState {
                    cancelToolbarButton
                }
            }
        }
        .sensoryFeedback(.success, trigger: feedbackTrigger)
        .sensoryFeedback(.error, trigger: errorFeedbackTrigger)
        .task {
            await startPayment()
        }
    }

    private var cancelToolbarButton: some View {
        Button(role: .destructive) {
            Task { await handleCancel() }
        } label: {
            Text("取引中止")
                .foregroundStyle(Color.appError)
        }
        .disabled(isCancelling)
    }

    // MARK: - 画面: 準備中

    private var creatingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
            Text("タッチ決済を準備中...")
                .font(.headline)
                .foregroundStyle(.secondary)
            if showInitProgress {
                TTPSetupProgressView()
                    .transition(.opacity)
            }
        }
    }

    // MARK: - 画面: NFC 読み取り中

    private var collectingView: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "wave.3.right.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color(red: 0.0, green: 0.478, blue: 1.0))
                .accessibilityHidden(true)

            Text("¥\(totalAmount.formatted())")
                .font(.system(size: 44, weight: .bold, design: .rounded))

            Text("カードをiPhoneの上部にかざしてください")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding()
    }

    // MARK: - 画面: 処理中 (iOS-3-033)

    private var processingView: some View {
        VStack(spacing: 24) {
            Spacer()
            ProgressView()
                .scaleEffect(2.0)
                .tint(.appPrimary)

            Text("¥\(totalAmount.formatted())")
                .font(.system(size: 44, weight: .bold, design: .rounded))

            Text("お支払いを処理中...")
                .font(.headline)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding()
    }

    // MARK: - 画面: 成功 (iOS-3-034)

    private var succeededView: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color.appSuccess)

            Text("お支払い完了")
                .font(.title.bold())

            Text("¥\(totalAmount.formatted())")
                .font(.system(size: 36, weight: .bold, design: .rounded))
            Spacer()
        }
        .padding()
    }

    // MARK: - 画面: キャンセル

    private var cancelledView: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color.appWarning)

            Text("キャンセルされました")
                .font(.title2.bold())

            Text("他の決済方法を選択するか取引を中止してください。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer()

            VStack(spacing: 12) {
                Button {
                    posVM.isTapToPayDisabled = true
                    posVM.navigationPath.removeLast()
                } label: {
                    Text("注文確認画面に戻る")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.borderedProminent)
                .tint(.appPrimary)

                Button(role: .destructive) {
                    Task { await handleCancel() }
                } label: {
                    Text("取引中止")
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .disabled(isCancelling)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    // MARK: - 画面: 拒否 (iOS-3-034)

    private func declinedView(_ reason: String) -> some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color.appError)

            Text("お支払いが拒否されました")
                .font(.title2.bold())

            Text(reason)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer()

            VStack(spacing: 12) {
                Button {
                    Task { await retryPayment() }
                } label: {
                    Text("再試行")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.borderedProminent)
                .tint(.appPrimary)

                Button {
                    posVM.isTapToPayDisabled = true
                    posVM.navigationPath.removeLast()
                } label: {
                    Text("別の方法で支払う")
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .buttonStyle(.bordered)

                Button(role: .destructive) {
                    Task { await handleCancel() }
                } label: {
                    Text("取引中止")
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .disabled(isCancelling)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    // MARK: - 画面: エラー (iOS-3-036)

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(Color.appError)

            Text("タッチ決済に失敗しました")
                .font(.title2.bold())

            Text("他の決済方法を選択するか取引を中止してください。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            if !message.isEmpty {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            VStack(spacing: 12) {
                Button {
                    posVM.isTapToPayDisabled = true
                    posVM.navigationPath.removeLast()
                } label: {
                    Text("注文確認画面に戻る")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.borderedProminent)
                .tint(.appPrimary)

                Button(role: .destructive) {
                    Task { await handleCancel() }
                } label: {
                    Text("取引中止")
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .disabled(isCancelling)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    // MARK: - 決済フロー開始

    private func startPayment() async {
        viewState = .creating
        showInitProgress = false

        do {
            // リーダー未接続なら自動接続
            let service = TapToPayService.shared
            if case .disconnected = service.connectionStatus {
                // 300ms 閾値: 接続に時間がかかる場合はプログレス表示
                let progressTask = Task {
                    try? await Task.sleep(for: .milliseconds(300))
                    if !Task.isCancelled {
                        showInitProgress = true
                    }
                }
                try await service.discoverAndConnect(
                    locationId: Constants.Stripe.locationId
                )
                progressTask.cancel()
                showInitProgress = false
            }

            // Step 1: トランザクション作成
            let items = posVM.cartItems.map {
                CreateTransactionRequestItem(productId: $0.productId, quantity: $0.quantity)
            }
            let txn = try await TransactionService.shared.createTransaction(
                orgId: orgId,
                items: items,
                paymentMethod: "TAP_TO_PAY",
                manualDiscountId: posVM.selectedManualDiscountId
            )
            transactionId = txn.id

            // Step 2: PaymentIntent 作成
            let intentResponse = try await TransactionService.shared.createPaymentIntent(
                orgId: orgId,
                transactionId: txn.id
            )
            paymentIntentId = intentResponse.paymentIntentId

            // Step 3: collectPaymentMethod → confirmPaymentIntent
            viewState = .collectingPayment
            let confirmedId = try await service.collectPayment(
                clientSecret: intentResponse.clientSecret
            )
            paymentIntentId = confirmedId

            // Step 4: 処理中表示
            viewState = .processing

            // Step 5: バックエンドに完了通知
            _ = try await TransactionService.shared.completeTapToPay(
                orgId: orgId,
                transactionId: txn.id,
                paymentIntentId: confirmedId
            )

            // Step 6: 成功表示 → PaymentCompleteView へ遷移
            viewState = .succeeded
            feedbackTrigger.toggle()
            try? await Task.sleep(for: .seconds(1.5))
            posVM.navigationPath.append(
                .paymentComplete(transactionId: txn.id, paymentMethod: "TAP_TO_PAY", receivedAmount: nil)
            )

        } catch is CancellationError {
            // Task キャンセル（画面遷移やキャンセルボタンによる）→ サイレントに終了
            await cancelResources()
            return
        } catch {
            // エラー発生時にトランザクション・PaymentIntent をキャンセル
            await cancelResources()
            handlePaymentError(error)
        }
    }

    // MARK: - 再試行

    private func retryPayment() async {
        transactionId = nil
        paymentIntentId = nil
        await startPayment()
    }

    // MARK: - リソースキャンセル（トランザクション + PaymentIntent）

    private func cancelResources() async {
        if let piId = paymentIntentId {
            try? await TransactionService.shared.cancelPaymentIntent(paymentIntentId: piId)
            paymentIntentId = nil
        }
        if let txnId = transactionId {
            try? await TransactionService.shared.cancelTransaction(orgId: orgId, transactionId: txnId)
            transactionId = nil
        }
    }

    // MARK: - キャンセル

    private func handleCancel() async {
        isCancelling = true
        await cancelResources()
        posVM.clearCart()
        posVM.calculationResult = nil
        posVM.selectedManualDiscountId = nil
        posVM.navigationPath.removeAll()
    }

    // MARK: - エラーハンドリング (iOS-3-036)

    private func handlePaymentError(_ error: Error) {
        let nsError = error as NSError

        // Stripe Terminal SDK の Tap to Pay エラー
        if nsError.scp_isTapToPayReaderError,
           let code = TapToPayReaderErrorCode(rawValue: nsError.code) {
            switch code {
            case .readCancelled, .pinCancelled, .accountLinkingCancelled:
                errorFeedbackTrigger.toggle()
                viewState = .cancelled
                return
            case .paymentCardDeclined:
                errorFeedbackTrigger.toggle()
                viewState = .declined("カード会社によりお支払いが拒否されました。")
            case .cardReadFailed, .paymentReadFailed:
                errorFeedbackTrigger.toggle()
                viewState = .declined("カードを読み取れませんでした。もう一度お試しください。")
            case .cardNotSupported:
                errorFeedbackTrigger.toggle()
                viewState = .declined("このカードは対応していません。別のカードをお試しください。")
            case .networkError, .networkAuthenticationError:
                errorFeedbackTrigger.toggle()
                viewState = .error("ネットワークに接続されていません。Wi-Fi を確認してください。")
            case .notReady, .noReaderSession:
                errorFeedbackTrigger.toggle()
                viewState = .error("リーダーが接続されていません。設定画面から再接続してください。")
            case .unsupported, .modelNotSupported:
                errorFeedbackTrigger.toggle()
                viewState = .error("このデバイスはタッチ決済に対応していません。")
            case .osVersionNotSupported:
                errorFeedbackTrigger.toggle()
                viewState = .error("iOSを最新バージョンに更新してください。")
            case .merchantBlocked, .deviceBanned:
                errorFeedbackTrigger.toggle()
                viewState = .error("決済の上限に達しました。別のデバイスを使用してください。")
            case .nfcDisabled:
                errorFeedbackTrigger.toggle()
                viewState = .error("NFCが無効になっています。設定からNFCを有効にしてください。")
            case .passcodeDisabled:
                errorFeedbackTrigger.toggle()
                viewState = .error("パスコードが設定されていません。設定からパスコードを有効にしてください。")
            case .readerBusy, .readerSessionBusy:
                errorFeedbackTrigger.toggle()
                viewState = .error("リーダーが使用中です。しばらくしてからお試しください。")
            case .prepareFailed, .readerInitializationFailed:
                errorFeedbackTrigger.toggle()
                viewState = .error("タッチ決済の初期化に失敗しました。")
            case .serviceConnectionError, .readerServiceConnectionError, .readerServiceError:
                errorFeedbackTrigger.toggle()
                viewState = .error("決済サービスへの接続に失敗しました。")
            case .accountNotLinked, .accountLinkingFailed:
                errorFeedbackTrigger.toggle()
                viewState = .error("アカウントの連携に失敗しました。設定画面からタッチ決済を再設定してください。")
            case .accountDeactivated:
                errorFeedbackTrigger.toggle()
                viewState = .error("アカウントが無効化されています。管理者に連絡してください。")
            default:
                errorFeedbackTrigger.toggle()
                viewState = .error("")
            }
        } else if nsError.domain == "com.stripe-terminal.error" {
            if nsError.code == 2020 { // SCPErrorCanceled
                errorFeedbackTrigger.toggle()
                viewState = .cancelled
                return
            }
            errorFeedbackTrigger.toggle()
            viewState = .error("")
        } else if let apiError = error as? APIError {
            errorFeedbackTrigger.toggle()
            viewState = .error(apiError.errorDescription ?? "サーバーとの通信に失敗しました。")
        } else {
            errorFeedbackTrigger.toggle()
            viewState = .error("")
        }
    }
}

#Preview {
    NavigationStack {
        TapToPayPaymentView(orgId: "preview-org")
    }
    .environment({
        let vm = POSViewModel()
        vm.cartItems = [
            CartItem(productId: "1", name: "たこ焼き", price: 600, discountedPrice: nil, quantity: 2)
        ]
        return vm
    }())
}
