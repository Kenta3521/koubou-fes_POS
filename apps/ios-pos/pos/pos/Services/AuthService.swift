import Foundation

final class AuthService {
    static let shared = AuthService()
    private init() {}

    // MARK: - Login

    func login(email: String, password: String) async throws -> LoginResponse {
        let body = LoginRequest(email: email, password: password)
        return try await APIClient.shared.request(.post, path: "/auth/login", body: body)
    }

    // MARK: - Current User (JWT 検証用)

    func fetchCurrentUser() async throws -> LoginUser {
        return try await APIClient.shared.request(.get, path: "/users/me")
    }

    // MARK: - 管理者用 全団体一覧

    func fetchAllOrganizations() async throws -> [OrganizationSummary] {
        return try await APIClient.shared.request(.get, path: "/admin/organizations/list")
    }

    // MARK: - Logout

    func logout() {
        KeychainHelper.shared.deleteToken()
        UserDefaults.standard.removeObject(forKey: Constants.UserDefaultsKeys.selectedOrganizationId)
    }
}

// MARK: - Request Body

private struct LoginRequest: Encodable {
    let email: String
    let password: String
}
