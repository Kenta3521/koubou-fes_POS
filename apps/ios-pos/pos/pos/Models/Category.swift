import Foundation
import SwiftData

@Model
final class CachedCategory {
    @Attribute(.unique) var id: String
    var organizationId: String
    var name: String
    var categoryDescription: String? // description は予約語に近いため categoryDescription とする
    var color: String?
    var sortOrder: Int
    var isActive: Bool
    
    // Relation
    @Relationship(deleteRule: .cascade, inverse: \CachedProduct.category)
    var products: [CachedProduct] = []
    
    init(id: String, organizationId: String, name: String, categoryDescription: String? = nil, color: String? = nil, sortOrder: Int = 0, isActive: Bool = true) {
        self.id = id
        self.organizationId = organizationId
        self.name = name
        self.categoryDescription = categoryDescription
        self.color = color
        self.sortOrder = sortOrder
        self.isActive = isActive
    }
}

// MARK: - API DTO

/// バックエンドの GET /organizations/:orgId/categories レスポンス用 DTO
struct APICategory: Decodable {
    let id: String
    let organizationId: String
    let name: String
    let sortOrder: Int
    // color / isActive は API に存在しないのでデフォルト値を使用
}
