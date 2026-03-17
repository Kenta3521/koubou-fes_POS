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
    var canUseBiometrics: Bool = false

    // MARK: - Dependencies

    private let authService = AuthService.shared
    private let keychainHelper = KeychainHelper.shared

    init() {
        checkBiometricsAvailability()
    }

    // MARK: - 起動時 JWT チェック (仕様書§6.2)

    func checkAuthOnStartup() async {
        guard keychainHelper.getToken() != nil else {
            appState = .login
            return
        }

        do {
            let user = try await authService.fetchCurrentUser()
            currentUser = user
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

    // MARK: - 生体認証ログイン (iOS-1-033)

    func authenticateWithBiometrics() async {
        let context = LAContext()
        var authError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &authError) else {
            errorMessage = "生体認証を利用できません"
            return
        }

        do {
            let result = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "アプリのロックを解除します"
            )
            if result {
                await checkAuthOnStartup()
            }
        } catch {
            // キャンセルや失敗は無視（手動ログインへ）
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

    private func checkBiometricsAvailability() {
        let context = LAContext()
        var error: NSError?
        canUseBiometrics = context.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            error: &error
        ) && KeychainHelper.shared.getToken() != nil
    }
}
