import Foundation
import SwiftData

@Model
final class CachedDiscount {
    @Attribute(.unique) var id: String
    var organizationId: String
    var name: String
    var type: String          // "FIXED" or "PERCENT"
    var value: Int
    var isActive: Bool

    // 自動適用判定フィールド
    var conditionType: String  // "NONE" | "MIN_QUANTITY" | "MIN_AMOUNT"
    var conditionValue: Int    // conditionType != "NONE" のときの閾値
    var triggerType: String    // "AUTO" | "MANUAL"
    var targetType: String     // "ALL_PRODUCTS" | "SPECIFIC_PROD" | "CATEGORY" | "ORDER_TOTAL"
    var targetProductId: String?
    var targetCategoryId: String?

    init(
        id: String,
        organizationId: String,
        name: String,
        type: String,
        value: Int,
        isActive: Bool = true,
        conditionType: String = "NONE",
        conditionValue: Int = 0,
        triggerType: String = "MANUAL",
        targetType: String = "ORDER_TOTAL",
        targetProductId: String? = nil,
        targetCategoryId: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.name = name
        self.type = type
        self.value = value
        self.isActive = isActive
        self.conditionType = conditionType
        self.conditionValue = conditionValue
        self.triggerType = triggerType
        self.targetType = targetType
        self.targetProductId = targetProductId
        self.targetCategoryId = targetCategoryId
    }
}

// MARK: - API DTO

/// バックエンドの GET /organizations/:orgId/discounts レスポンス用 DTO
struct APIDiscount: Decodable {
    let id: String
    let organizationId: String
    let name: String
    let type: String          // "FIXED" or "PERCENT"
    let value: Int
    let isActive: Bool
    let conditionType: String
    let conditionValue: Int
    let triggerType: String
    let targetType: String
    let targetProductId: String?
    let targetCategoryId: String?
}
