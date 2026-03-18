import Foundation
import LocalAuthentication

@MainActor
@Observable
final class AuthViewModel {

    // MARK: - App State

    enum AppState {
        case loading      // 起動時JWT検証中
        case login        // ログイン画面
        case orgSelect    // 団体選択画面
        case main         // メイン画面(TabView)
    }

    // MARK: - Published State

    var appState: AppState = .loading
    var currentUser: LoginUser?
    var selectedOrganization: UserOrganization?
    var adminOrganizations: [OrganizationSummary] = []
    var errorMessage: String?
    var isLoading = false

    // MARK: - Dependencies

    private let authService = AuthService.shared
    private let keychainHelper = KeychainHelper.shared

    // MARK: - 起動時 JWT チェック (仕様書§6.2)

    func checkAuthOnStartup() async {
        guard keychainHelper.getToken() != nil else {
            appState = .login
            return
        }

        // 生体認証を要求（対応デバイスの場合）
        let authenticated = await requestBiometricAuth()
        guard authenticated else {
            appState = .login
            return
        }

        do {
            let user = try await authService.fetchCurrentUser()
            currentUser = user

            // システム管理者は全団体リストを取得（団体選択画面で必要）
            if user.isSystemAdmin {
                adminOrganizations = (try? await authService.fetchAllOrganizations()) ?? []
            }

            resolveInitialDestination(for: user)
        } catch {
            // 401 またはネットワークエラー → ログイン画面
            keychainHelper.deleteToken()
            appState = .login
        }
    }

    // MARK: - ログイン

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response = try await authService.login(email: email, password: password)
            keychainHelper.saveToken(response.token)
            currentUser = response.user

            if response.user.isSystemAdmin {
                adminOrganizations = (try? await authService.fetchAllOrganizations()) ?? []
                appState = .orgSelect
            } else {
                resolveInitialDestination(for: response.user)
            }
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "ログインに失敗しました"
        }
    }

    // MARK: - 生体認証 (iOS-3-054)

    /// 生体認証を要求する。設定 OFF またはデバイス非対応の場合は true を返す。
    func requestBiometricAuth() async -> Bool {
        let enabled = UserDefaults.standard.bool(
            forKey: Constants.UserDefaultsKeys.biometricLockEnabled
        )
        guard enabled else { return true }

        let context = LAContext()
        var error: NSError?
        // パスコードフォールバック付き（生体認証失敗後も解除可能にする）
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            return true
        }
        do {
            return try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "アプリのロックを解除します"
            )
        } catch {
            return false
        }
    }

    /// デバイスの生体認証タイプに応じた SF Symbol 名を返す
    static var biometrySymbolName: String {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        switch context.biometryType {
        case .touchID: return "touchid"
        case .opticID: return "opticid"
        default: return "faceid"
        }
    }

    /// デバイスの生体認証タイプに応じたラベルを返す
    static var biometryLabel: String {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        switch context.biometryType {
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Face ID"
        }
    }

    // MARK: - 団体選択

    func selectOrganization(id: String) {
        guard let user = currentUser else { return }

        if user.isSystemAdmin {
            guard let org = adminOrganizations.first(where: { $0.id == id }) else { return }
            selectedOrganization = UserOrganization(
                id: org.id,
                name: org.name,
                isActive: org.isActive,
                role: "SYSTEM_ADMIN",
                permissions: []
            )
        } else {
            guard let org = user.organizations.first(where: { $0.id == id }) else { return }
            selectedOrganization = org
        }

        UserDefaults.standard.set(id, forKey: Constants.UserDefaultsKeys.selectedOrganizationId)
        appState = .main
    }

    // MARK: - ログアウト

    func logout() {
        authService.logout()
        currentUser = nil
        selectedOrganization = nil
        adminOrganizations = []
        errorMessage = nil
        appState = .login
    }

    // MARK: - Private Helpers

    /// ログイン後の遷移先を決定する
    /// - 前回選択した団体があればそこへ
    /// - 1団体のみなら自動選択してメインへ
    /// - それ以外は団体選択画面へ
    private func resolveInitialDestination(for user: LoginUser) {
        let savedOrgId = UserDefaults.standard.string(forKey: Constants.UserDefaultsKeys.selectedOrganizationId)

        // システム管理者: adminOrganizations から復元
        if user.isSystemAdmin {
            if let savedOrgId,
               let org = adminOrganizations.first(where: { $0.id == savedOrgId }),
               org.isActive {
                selectedOrganization = UserOrganization(
                    id: org.id,
                    name: org.name,
                    isActive: org.isActive,
                    role: "SYSTEM_ADMIN",
                    permissions: []
                )
                appState = .main
            } else {
                appState = .orgSelect
            }
            return
        }

        // 一般ユーザー: user.organizations から復元
        if let savedOrgId,
           let org = user.organizations.first(where: { $0.id == savedOrgId }),
           org.isActive {
            selectedOrganization = org
            appState = .main
            return
        }

        let activeOrgs = user.organizations.filter(\.isActive)
        if activeOrgs.count == 1, let only = activeOrgs.first {
            selectedOrganization = only
            UserDefaults.standard.set(only.id, forKey: Constants.UserDefaultsKeys.selectedOrganizationId)
            appState = .main
        } else {
            appState = .orgSelect
        }
    }

    // MARK: - Tap to Pay 権限チェック (iOS-3-014)

    var hasTapToPayPermission: Bool {
        if currentUser?.isSystemAdmin == true { return true }
        return selectedOrganization?.permissions.contains("enable_tap_to_pay") ?? false
    }

}
