import Foundation

// MARK: - ログインレスポンス

struct LoginResponse: Decodable {
    let token: String
    let user: LoginUser
}

// MARK: - ユーザー情報

struct LoginUser: Decodable {
    let id: String
    let email: String
    let name: String
    let status: String
    let isSystemAdmin: Bool
    let createdAt: String
    let organizations: [UserOrganization]
}

// MARK: - 所属団体

struct UserOrganization: Decodable, Identifiable {
    let id: String
    let name: String
    let isActive: Bool
    let role: String
    let permissions: [String]
}

// MARK: - 管理者用 全団体一覧 (GET /admin/organizations/list の data[] 要素)

struct OrganizationSummary: Decodable, Identifiable {
    let id: String
    let name: String
    let isActive: Bool
}
