import Foundation
import CoreLocation

@MainActor
@Observable
final class SettingsViewModel {

    // MARK: - UI State

    var showLogoutConfirmation = false
    var ttpError: String?
    var isConnectingTTP = false

    private let locationManager = CLLocationManager()

    // MARK: - TTP 操作 (iOS-3-053)

    func connectTapToPay() async {
        isConnectingTTP = true
        defer { isConnectingTTP = false }

        // Stripe Terminal SDK は位置情報を必要とするため、
        // 決済画面ではなく設定画面での有効化時に事前に許可を求める
        let status = locationManager.authorizationStatus
        if status == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
            // 許可ダイアログの結果を待つ
            try? await Task.sleep(for: .seconds(1))
        }

        do {
            try await TapToPayService.shared.discoverAndConnect(
                locationId: Constants.Stripe.locationId
            )
            // 有効化成功 → 次回起動時の自動接続を有効にする
            UserDefaults.standard.set(true, forKey: Constants.UserDefaultsKeys.ttpOnboardingCompleted)
            UserDefaults.standard.set(true, forKey: Constants.UserDefaultsKeys.ttpSplashDismissed)
        } catch {
            ttpError = error.localizedDescription
        }
    }

    func disconnectTapToPay() async {
        do {
            try await TapToPayService.shared.disconnect()
        } catch {
            ttpError = error.localizedDescription
        }
    }
}
