import Foundation
import KeychainAccess

final class KeychainHelper: @unchecked Sendable {
    nonisolated(unsafe) static let shared = KeychainHelper()
    
    // Bundle Identifier based service name
    private let keychain: Keychain
    
    private init() {
        // Defaults to bundle identifier as the service name
        if let bundleId = Bundle.main.bundleIdentifier {
            keychain = Keychain(service: bundleId)
        } else {
            keychain = Keychain(service: "com.koubou-fes.pos")
        }
    }
    
    // Keys
    private let jwtTokenKey = "jwtToken"
    
    /// 保存されている JWT トークンを取得
    func getToken() -> String? {
        return try? keychain.get(jwtTokenKey)
    }
    
    /// JWT トークンを保存
    func saveToken(_ token: String) {
        do {
            try keychain.set(token, key: jwtTokenKey)
        } catch {
            print("Failed to save token to Keychain: \(error)")
        }
    }
    
    /// JWT トークンを削除
    func deleteToken() {
        do {
            try keychain.remove(jwtTokenKey)
        } catch {
            print("Failed to remove token from Keychain: \(error)")
        }
    }
}
