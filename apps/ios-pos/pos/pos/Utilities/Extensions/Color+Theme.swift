import SwiftUI

extension Color {
    // プライマリ: Web版に合わせた orange-500 / orange-400
    static let appPrimary      = Color(red: 0.976, green: 0.451, blue: 0.086) // #f97316 (orange-500)
    static let appPrimaryLight = Color(red: 0.984, green: 0.573, blue: 0.235) // #fb923c (orange-400)

    // セマンティックカラー（Web版 Tailwind と対応）
    static let appSuccess = Color(red: 0.133, green: 0.773, blue: 0.369)      // #22c55e (green-500)
    static let appWarning = Color(red: 0.961, green: 0.620, blue: 0.043)      // #f59e0b (amber-500)
    static let appError   = Color(red: 0.937, green: 0.267, blue: 0.267)      // #ef4444 (red-500)
}
