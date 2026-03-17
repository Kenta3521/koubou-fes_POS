import Foundation
import SwiftData

/// SwiftData(SQLite)へのデータ読み書きをバックグラウンドスレッドで安全に行うアクター
@ModelActor
actor CacheService {
    
    // MARK: - Products
    
    func saveProducts(_ products: [CachedProduct], clearExisting: Bool = true) throws {
        if clearExisting {
            try deleteProducts()
        }
        for product in products {
            modelContext.insert(product)
        }
        try modelContext.save()
    }
    
    func fetchProducts(for organizationId: String) throws -> [CachedProduct] {
        let descriptor = FetchDescriptor<CachedProduct>(
            predicate: #Predicate { $0.organizationId == organizationId },
            sortBy: [SortDescriptor(\.sortOrder)]
        )
        return try modelContext.fetch(descriptor)
    }
    
    func deleteProducts() throws {
        // iOS 17のSwiftDataではリレーションを持つモデルをモデル型指定(Batch Delete)で消そうとすると
        // Constraint trigger violationエラーが発生することがあるため、個別にfetchして削除します
        let items = try modelContext.fetch(FetchDescriptor<CachedProduct>())
        for item in items {
            modelContext.delete(item)
        }
        try modelContext.save()
    }
    
    // MARK: - Categories
    
    func saveCategories(_ categories: [CachedCategory], clearExisting: Bool = true) throws {
        if clearExisting {
            try deleteCategories()
        }
        for category in categories {
            modelContext.insert(category)
        }
        try modelContext.save()
    }
    
    func fetchCategories(for organizationId: String) throws -> [CachedCategory] {
        let descriptor = FetchDescriptor<CachedCategory>(
            predicate: #Predicate { $0.organizationId == organizationId },
            sortBy: [SortDescriptor(\.sortOrder)]
        )
        return try modelContext.fetch(descriptor)
    }
    
    func deleteCategories() throws {
        let items = try modelContext.fetch(FetchDescriptor<CachedCategory>())
        for item in items {
            modelContext.delete(item)
        }
        try modelContext.save()
    }
    
    // MARK: - Discounts
    
    func saveDiscounts(_ discounts: [CachedDiscount], clearExisting: Bool = true) throws {
        if clearExisting {
            try deleteDiscounts()
        }
        for discount in discounts {
            modelContext.insert(discount)
        }
        try modelContext.save()
    }
    
    func fetchDiscounts(for organizationId: String) throws -> [CachedDiscount] {
        let descriptor = FetchDescriptor<CachedDiscount>(
            predicate: #Predicate { $0.organizationId == organizationId },
            sortBy: [SortDescriptor(\.name)]
        )
        return try modelContext.fetch(descriptor)
    }
    
    func deleteDiscounts() throws {
        let items = try modelContext.fetch(FetchDescriptor<CachedDiscount>())
        for item in items {
            modelContext.delete(item)
        }
        try modelContext.save()
    }
}
