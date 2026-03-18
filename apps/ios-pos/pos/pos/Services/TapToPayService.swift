import Foundation
import StripeTerminal

// MARK: - エラー定義

enum TapToPayError: LocalizedError {
    case alreadyConnecting
    case notConnected
    case notImplemented

    var errorDescription: String? {
        switch self {
        case .alreadyConnecting: return "リーダー接続処理が進行中です"
        case .notConnected: return "リーダーが接続されていません"
        case .notImplemented: return "この機能は未実装です"
        }
    }
}

// MARK: - TapToPayService

@Observable
final class TapToPayService: NSObject {

    static let shared = TapToPayService()

    // MARK: - State

    enum ReaderConnectionStatus: Equatable {
        case disconnected
        case discovering
        case connecting
        case connected
        case error(String)
    }

    enum ReaderPaymentStatus: Equatable {
        case idle
        case collectingPayment
        case processing
        case completed(String)
        case failed(String)
        case cancelled
    }

    var connectionStatus: ReaderConnectionStatus = .disconnected
    var paymentStatus: ReaderPaymentStatus = .idle
    var setupProgress: Float = 0.0
    var isReaderReady: Bool = false

    // MARK: - Init

    private override init() {
        super.init()
    }

    // MARK: - Discover & Connect (iOS-3-012 / iOS-3-013)

    func discoverAndConnect(locationId: String) async throws {
        switch connectionStatus {
        case .discovering, .connecting, .connected:
            return
        default:
            break
        }

        DispatchQueue.main.async { self.connectionStatus = .discovering }

        do {
            let discoveryConfig = try TapToPayDiscoveryConfigurationBuilder()
                .setSimulated(false)
                .build()

            let connectionConfig = try TapToPayConnectionConfigurationBuilder(
                delegate: self,
                locationId: locationId
            )
            .setTosAcceptancePermitted(true)
            .build()

            let easyConnectConfig = TapToPayEasyConnectConfiguration(
                discoveryConfiguration: discoveryConfig,
                connectionConfiguration: connectionConfig
            )

            DispatchQueue.main.async { self.connectionStatus = .connecting }

            let _ = try await Terminal.shared.easyConnect(easyConnectConfig)

            DispatchQueue.main.async {
                self.connectionStatus = .connected
                self.isReaderReady = true
            }
        } catch {
            DispatchQueue.main.async {
                self.connectionStatus = .error(error.localizedDescription)
                self.isReaderReady = false
            }
            throw error
        }
    }

    // MARK: - Payment (iOS-3-032)

    /// PaymentIntent 取得 → collectPaymentMethod → confirmPaymentIntent の一連フロー
    /// - Returns: 確定した PaymentIntent の stripeId
    func collectPayment(clientSecret: String) async throws -> String {
        DispatchQueue.main.async { self.paymentStatus = .collectingPayment }

        // 1. PaymentIntent を取得（コールバック → async 変換）
        let paymentIntent = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<PaymentIntent, Error>) in
            Terminal.shared.retrievePaymentIntent(clientSecret: clientSecret) { intent, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let intent {
                    continuation.resume(returning: intent)
                } else {
                    continuation.resume(throwing: TapToPayError.notConnected)
                }
            }
        }

        // 2. processPaymentIntent (collectPaymentMethod + confirmPaymentIntent の一括処理)
        //    SDK が NFC リーダー UI を表示 → カード検出 → 決済確定
        DispatchQueue.main.async { self.paymentStatus = .collectingPayment }
        let confirmedPI = try await Terminal.shared.processPaymentIntent(paymentIntent)

        DispatchQueue.main.async {
            self.paymentStatus = .completed(confirmedPI.stripeId ?? "")
        }

        return confirmedPI.stripeId ?? ""
    }

    /// PaymentIntent をキャンセルする（Stripe 側）
    func cancelPaymentIntent(_ paymentIntent: PaymentIntent) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Terminal.shared.cancelPaymentIntent(paymentIntent) { _, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
        DispatchQueue.main.async { self.paymentStatus = .cancelled }
    }

    // MARK: - Disconnect

    func disconnect() async throws {
        try await Terminal.shared.disconnectReader()
        DispatchQueue.main.async {
            self.connectionStatus = .disconnected
            self.isReaderReady = false
        }
    }
}

// MARK: - ConnectionTokenProvider (iOS-3-010)

extension TapToPayService: ConnectionTokenProvider {
    func fetchConnectionToken() async throws -> String {
        let response: ConnectionTokenResponse = try await APIClient.shared.request(
            .post,
            path: "/stripe/connection-token"
        )
        return response.secret
    }
}

// MARK: - TapToPayReaderDelegate (iOS-3-011)

extension TapToPayService: TapToPayReaderDelegate {
    func tapToPayReader(
        _ reader: Reader,
        didStartInstallingUpdate update: ReaderSoftwareUpdate,
        cancelable: Cancelable?
    ) {
        DispatchQueue.main.async {
            self.setupProgress = 0.0
        }
    }

    func tapToPayReader(
        _ reader: Reader,
        didReportReaderSoftwareUpdateProgress progress: Float
    ) {
        DispatchQueue.main.async {
            self.setupProgress = progress
        }
    }

    func tapToPayReader(
        _ reader: Reader,
        didFinishInstallingUpdate update: ReaderSoftwareUpdate?,
        error: (any Error)?
    ) {
        DispatchQueue.main.async {
            self.setupProgress = 1.0
        }
    }

    func tapToPayReader(
        _ reader: Reader,
        didRequestReaderInput inputOptions: ReaderInputOptions
    ) {
        // カード提示待ち — UI 表示は ViewModel 側で connectionStatus を監視して行う
    }

    func tapToPayReader(
        _ reader: Reader,
        didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage
    ) {
        // リーダーからのメッセージ — 必要に応じてログ出力
    }
}

// MARK: - TerminalDelegate (iOS-3-010)

extension TapToPayService: TerminalDelegate {
    func terminal(
        _ terminal: Terminal,
        didChangeConnectionStatus status: ConnectionStatus
    ) {
        // SDK の接続ステータス変更を監視（必要に応じて拡張）
    }

    func terminal(
        _ terminal: Terminal,
        didChangePaymentStatus status: PaymentStatus
    ) {
        // SDK の決済ステータス変更を監視（必要に応じて拡張）
    }
}
