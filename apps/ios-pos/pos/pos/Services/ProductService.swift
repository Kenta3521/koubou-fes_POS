import Foundation
import SwiftData

final class ProductService {
    static let shared = ProductService()
    private init() {}

    // MARK: - キャッシュ更新（iOS-2-001, iOS-2-002）

    /// 商品・カテゴリ・割引を API から並行取得して SwiftData に保存する。
    /// アプリ起動時および会計完了後に呼ぶ。
    func refreshAllCache(for orgId: String, modelContainer: ModelContainer) async throws {
        async let productsTask   = fetchProducts(orgId: orgId)
        async let categoriesTask = fetchCategories(orgId: orgId)
        async let discountsTask  = fetchDiscounts(orgId: orgId)

        let (apiProducts, apiCategories, apiDiscounts) = try await (productsTask, categoriesTask, discountsTask)

        let cachedCategories = apiCategories.map { makeCategory($0) }
        let cachedProducts   = apiProducts.enumerated().map { makeProduct($0.element, index: $0.offset) }
        let cachedDiscounts  = apiDiscounts.map { makeDiscount($0) }

        let cache = CacheService(modelContainer: modelContainer)
        // カテゴリを先に保存（商品との関係性のため）
        try await cache.saveCategories(cachedCategories)
        try await cache.saveProducts(cachedProducts)
        try await cache.saveDiscounts(cachedDiscounts)
    }

    /// 割引のみ API から再取得して SwiftData キャッシュを更新する。
    /// 手動割引シート表示前に呼ぶ。
    func refreshDiscountsCache(for orgId: String, modelContainer: ModelContainer) async throws {
        let apiDiscounts = try await fetchDiscounts(orgId: orgId)
        let cached = apiDiscounts.map { makeDiscount($0) }
        let cache = CacheService(modelContainer: modelContainer)
        try await cache.saveDiscounts(cached)
    }

    // MARK: - /calculate API（iOS-2-003）

    /// カート内容と任意の手動割引 ID をもとに合計金額を計算する。
    /// アプリ側では計算ロジックを持たず、必ず API に委譲する（仕様書 §4.4）。
    func calculate(
        orgId: String,
        items: [CalculationRequestItem],
        manualDiscountId: String? = nil
    ) async throws -> CalculationResult {
        let body = CalculationRequest(items: items, manualDiscountId: manualDiscountId)
        return try await APIClient.shared.request(
            .post,
            path: "/organizations/\(orgId)/transactions/calculate",
            body: body
        )
    }

    // MARK: - Private: API fetch

    private func fetchProducts(orgId: String) async throws -> [APIProduct] {
        return try await APIClient.shared.request(.get, path: "/organizations/\(orgId)/products")
    }

    private func fetchCategories(orgId: String) async throws -> [APICategory] {
        return try await APIClient.shared.request(.get, path: "/organizations/\(orgId)/categories")
    }

    private func fetchDiscounts(orgId: String) async throws -> [APIDiscount] {
        return try await APIClient.shared.request(.get, path: "/organizations/\(orgId)/discounts")
    }

    // MARK: - Private: DTO → SwiftData モデル変換

    private func makeProduct(_ dto: APIProduct, index: Int) -> CachedProduct {
        CachedProduct(
            id: dto.id,
            organizationId: dto.organizationId,
            categoryId: dto.categoryId ?? "",
            name: dto.name,
            price: dto.price,
            isAvailable: dto.isActive && dto.stock > 0,
            sortOrder: index
        )
    }

    private func makeCategory(_ dto: APICategory) -> CachedCategory {
        CachedCategory(
            id: dto.id,
            organizationId: dto.organizationId,
            name: dto.name,
            sortOrder: dto.sortOrder
        )
    }

    private func makeDiscount(_ dto: APIDiscount) -> CachedDiscount {
        CachedDiscount(
            id: dto.id,
            organizationId: dto.organizationId,
            name: dto.name,
            type: dto.type,
            value: dto.value,
            isActive: dto.isActive,
            conditionType: dto.conditionType,
            conditionValue: dto.conditionValue,
            triggerType: dto.triggerType,
            targetType: dto.targetType,
            targetProductId: dto.targetProductId,
            targetCategoryId: dto.targetCategoryId
        )
    }
}
