import Foundation
import SwiftData

@Model
final class CachedProduct {
    @Attribute(.unique) var id: String
    var organizationId: String
    var categoryId: String
    var name: String
    var productDescription: String? // description 回避
    var price: Int
    var isAvailable: Bool
    var sortOrder: Int
    
    var category: CachedCategory?
    
    init(id: String, organizationId: String, categoryId: String, name: String, productDescription: String? = nil, price: Int, isAvailable: Bool = true, sortOrder: Int = 0) {
        self.id = id
        self.organizationId = organizationId
        self.categoryId = categoryId
        self.name = name
        self.productDescription = productDescription
        self.price = price
        self.isAvailable = isAvailable
        self.sortOrder = sortOrder
    }
}

// MARK: - API DTO

/// バックエンドの GET /organizations/:orgId/products レスポンス用 DTO
struct APIProduct: Decodable {
    let id: String
    let organizationId: String
    let categoryId: String?
    let name: String
    let price: Int
    let stock: Int
    let isActive: Bool
}
