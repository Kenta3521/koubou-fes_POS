import Foundation

enum APIError: Error, LocalizedError {
    case unauthorized
    case forbidden
    case notFound
    case serverError(statusCode: Int)
    case decodingError(Error)
    case networkError(Error)
    case invalidResponse
    case unknown(statusCode: Int?)
    
    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "認証に失敗しました。再度ログインしてください。"
        case .forbidden:
            return "アクセス権限がありません。"
        case .notFound:
            return "リクエストされたリソースが見つかりませんでした。"
        case .serverError(let statusCode):
            return "サーバーエラーが発生しました (コード: \(statusCode))"
        case .decodingError(let error):
            return "データの読み込みに失敗しました: \(error.localizedDescription)"
        case .networkError(let error):
            return "通信エラーが発生しました: \(error.localizedDescription)"
        case .invalidResponse:
            return "サーバーから不正な応答がありました。"
        case .unknown(let statusCode):
            if let code = statusCode {
                return "予期せぬエラーが発生しました (コード: \(code))"
            } else {
                return "予期せぬエラーが発生しました。"
            }
        }
    }
}
