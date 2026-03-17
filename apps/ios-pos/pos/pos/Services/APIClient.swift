import Foundation

actor APIClient {
    nonisolated(unsafe) static let shared = APIClient()
    
    private let baseURL: URL
    private let session: URLSession
    private let keychainHelper: KeychainHelper
    
    // リフレッシュ処理への多重アクセスを防ぐためのTask
    private var refreshTask: Task<Void, Error>?
    
    private init() {
        self.baseURL = Constants.API.baseURL
        self.session = URLSession.shared
        self.keychainHelper = KeychainHelper.shared
    }
    
    /// 汎用リクエストメソッド
    func request<T: Decodable>(
        _ method: HTTPMethod,
        path: String,
        body: Encodable? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        return try await performRequest(method, path: path, body: body, queryItems: queryItems, isRetry: false)
    }
    
    /// 内部リクエストメソッド（再試行フラグ付き）
    private func performRequest<T: Decodable>(
        _ method: HTTPMethod,
        path: String,
        body: Encodable?,
        queryItems: [URLQueryItem]?,
        isRetry: Bool
    ) async throws -> T {
        
        let url = prepareURL(path: path, queryItems: queryItems)
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // JWTトークンの自動付与
        if let token = keychainHelper.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            let encoder = JSONEncoder()
            // ISO8601等必要に応じて日付フォーマットなどを設定
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(body)
        }
        
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            // 成功、デコードして返す
            do {
                if T.self == EmptyResponse.self {
                    return EmptyResponse() as! T
                }
                
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
            
        case 401:
            // 401 Unauthorized
            // リフレッシュのエンドポイント自体で401が起きた場合は再帰を防ぐため再試行しない
            if path == "/auth/refresh" || isRetry {
                throw APIError.unauthorized
            }
            
            // トークンリフレッシュを試みる
            try await refreshAuthToken()
            
            // リフレッシュ成功後、1回だけ再試行
            return try await performRequest(method, path: path, body: body, queryItems: queryItems, isRetry: true)
            
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 500...599:
            throw APIError.serverError(statusCode: httpResponse.statusCode)
        default:
            throw APIError.unknown(statusCode: httpResponse.statusCode)
        }
    }
    
    /// URLの構築
    private func prepareURL(path: String, queryItems: [URLQueryItem]?) -> URL {
        let safePath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        var components = URLComponents(url: baseURL.appendingPathComponent(safePath), resolvingAgainstBaseURL: false)!
        if let items = queryItems, !items.isEmpty {
            components.queryItems = items
        }
        return components.url!
    }
    
    /// 401エラー時のトークンリフレッシュ処理
    private func refreshAuthToken() async throws {
        // すでに別のリクエストがリフレッシュを実行中ならそれに相乗りする
        if let refreshTask = refreshTask {
            return try await refreshTask.value
        }
        
        let task = Task {
            // リフレッシュリクエストを送信
            // ※ここで依存関係や無限ループを避けるため専用のStructにデコード
            let response: AuthResponse = try await self.performRequest(.post, path: "/auth/refresh", body: nil as EmptyRequestBody?, queryItems: nil, isRetry: true)
            
            // 新しいトークンをキーチェーンに保存
            self.keychainHelper.saveToken(response.token)
        }
        
        self.refreshTask = task
        
        do {
            try await task.value
            // 完了後はタスクをクリア
            self.refreshTask = nil
        } catch {
            self.refreshTask = nil
            throw error
        }
    }
}

// MARK: - Dummy / Helper Types for request

/// ボディなしリクエスト等のためのダミー構造体
struct EmptyRequestBody: Encodable {}

/// 空のレスポンスを受け取るためのダミー構造体（ステータスコードのみで成功を判定する場合等）
struct EmptyResponse: Decodable {}

/// 認証関連のレスポンス（リフレッシュで受け取る形を想定）
struct AuthResponse: Decodable {
    let token: String
    // let user: User ... // 今回リフレッシュ処理に必要なのはtokenのみの想定
}
