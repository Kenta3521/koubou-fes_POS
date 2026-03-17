import Foundation

// MARK: - API レスポンスエンベロープ

/// バックエンドの統一レスポンス形式 { success: Bool, data: T } のラッパー
struct APIEnvelope<T: Decodable>: Decodable {
    let data: T
}

// MARK: - Request / Response Helper Types

/// ボディなしリクエスト等のためのダミー構造体
struct EmptyRequestBody: Encodable {}

/// 空のレスポンスを受け取るためのダミー構造体（ステータスコードのみで成功を判定する場合等）
struct EmptyResponse: Decodable {}

/// 認証関連のレスポンス（リフレッシュで受け取る形を想定）
struct AuthResponse: Decodable {
    let token: String
}
