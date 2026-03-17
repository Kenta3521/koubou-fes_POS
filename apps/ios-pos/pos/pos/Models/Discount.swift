import Foundation
import SwiftData

@Model
final class CachedDiscount {
    @Attribute(.unique) var id: String
    var organizationId: String
    var name: String
    var type: String // "AMOUNT" or "PERCENTAGE"
    var value: Int
    var isActive: Bool
    
    init(id: String, organizationId: String, name: String, type: String, value: Int, isActive: Bool = true) {
        self.id = id
        self.organizationId = organizationId
        self.name = name
        self.type = type
        self.value = value
        self.isActive = isActive
    }
}
