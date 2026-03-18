import SwiftUI
import SwiftData

struct OrderInputView: View {
    let orgId: String
    @Query private var products: [CachedProduct]
    @Query private var categories: [CachedCategory]
    @Query private var discounts: [CachedDiscount]
    @Environment(POSViewModel.self) private var posVM
    @Environment(\.modelContext) private var modelContext

    init(orgId: String) {
        self.orgId = orgId
        _products = Query(
            filter: #Predicate<CachedProduct> { $0.organizationId == orgId },
            sort: \.sortOrder
        )
        _categories = Query(
            filter: #Predicate<CachedCategory> { $0.organizationId == orgId },
            sort: \.sortOrder
        )
        _discounts = Query(
            filter: #Predicate<CachedDiscount> { $0.organizationId == orgId && $0.isActive }
        )
    }

    // MARK: - Helpers

    private var filteredProducts: [CachedProduct] {
        guard let catId = posVM.selectedCategoryId else { return products }
        return products.filter { $0.categoryId == catId }
    }

    /// AUTO+NONE 割引を適用した後の価格を返す（割引なしなら nil）
    private func discountedPrice(for product: CachedProduct, discount: CachedDiscount?) -> Int? {
        guard let d = discount else { return nil }
        let price = d.type == "PERCENT"
            ? max(0, product.price - product.price * d.value / 100)
            : max(0, product.price - d.value)
        return price != product.price ? price : nil
    }

    /// 商品に自動適用されるべき割引を返す（条件なし AUTO 割引のみ）
    private func autoDiscount(for product: CachedProduct) -> CachedDiscount? {
        discounts.filter { d in
            d.triggerType == "AUTO"
            && d.conditionType == "NONE"
            && (d.targetType == "ALL_PRODUCTS"
                || (d.targetType == "SPECIFIC_PROD" && d.targetProductId == product.id)
                || (d.targetType == "CATEGORY" && d.targetCategoryId == product.categoryId))
        }.first
    }

    // MARK: - Body

    var body: some View {
        VStack(spacing: 0) {
            categoryTabBar
            productGrid
        }
        .navigationTitle("商品選択")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            cartButton
        }
        .sheet(isPresented: Binding(
            get: { posVM.isCartPresented },
            set: { posVM.isCartPresented = $0 }
        )) {
            CartSheetView(availableProductIds: Set(products.filter(\.isAvailable).map(\.id)), onCheckout: {
                posVM.isCartPresented = false
                // シートの閉幕アニメーション（約0.35秒）完了後に NavigationPath へ push する。
                // 同一フレームで実行すると NavigationStack がフリーズするため asyncAfter で遅延する。
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    posVM.navigationPath.append(.orderConfirm)
                }
            })
        }
        .sensoryFeedback(.impact(weight: .light), trigger: posVM.totalItemCount)
        .onAppear {
            // TTP エラー後に商品選択画面に戻った場合、再度利用可能にする
            posVM.isTapToPayDisabled = false
        }
    }

    // MARK: - Category Tab Bar

    private var categoryTabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                CategoryTabButton(
                    title: "全商品",
                    isSelected: posVM.selectedCategoryId == nil
                ) {
                    posVM.selectedCategoryId = nil
                }
                ForEach(categories) { category in
                    CategoryTabButton(
                        title: category.name,
                        isSelected: posVM.selectedCategoryId == category.id
                    ) {
                        posVM.selectedCategoryId = category.id
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Product Grid

    private var productGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10),
            GridItem(.flexible(), spacing: 10)
        ]
        return ScrollView {
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(filteredProducts) { product in
                    let discount = autoDiscount(for: product)
                    let cartQty = posVM.cartItems.first(where: { $0.productId == product.id })?.quantity ?? 0
                    ProductCard(
                        product: product,
                        discount: discount,
                        cartQuantity: cartQty
                    ) {
                        guard product.isAvailable else { return }
                        posVM.addToCart(product, discountedPrice: discountedPrice(for: product, discount: discount))
                    }
                }
            }
            .padding(12)
            .padding(.bottom, 72)
        }
        .refreshable {
            try? await ProductService.shared.refreshAllCache(
                for: orgId,
                modelContainer: modelContext.container
            )
        }
    }

    // MARK: - Cart Button

    private var cartButton: some View {
        Button {
            if posVM.totalItemCount > 0 {
                posVM.isCartPresented = true
            }
        } label: {
            HStack(spacing: 8) {
                ZStack {
                    Image(systemName: "cart.fill")
                        .font(.body)
                    if posVM.totalItemCount > 0 {
                        Text("\(posVM.totalItemCount)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color.appError)
                            .clipShape(Capsule())
                            .offset(x: 12, y: -10)
                    }
                }
                Text("カート")
                    .font(.subheadline.bold())

                Spacer()

                Text("× ")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
                +
                Text("¥\(posVM.subtotalPrice.formatted())")
                    .font(.subheadline.bold())

                Image(systemName: "chevron.up")
                    .font(.caption.bold())
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(posVM.totalItemCount > 0 ? Color.appPrimary : Color(.systemGray4))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
        .disabled(posVM.totalItemCount == 0)
        .accessibilityLabel("カートを開く、\(posVM.totalItemCount)点、¥\(posVM.subtotalPrice.formatted())")
    }
}

// MARK: - CategoryTabButton

private struct CategoryTabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(isSelected ? .semibold : .regular))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color.appPrimary : Color(.systemBackground))
                .foregroundStyle(isSelected ? Color.white : Color.primary)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isSelected ? Color.clear : Color(.systemGray4),
                            lineWidth: 1
                        )
                )
        }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - ProductCard

private struct ProductCard: View {
    let product: CachedProduct
    let discount: CachedDiscount?
    let cartQuantity: Int
    let onTap: () -> Void

    private var effectivePrice: Int {
        guard let d = discount else { return product.price }
        if d.type == "PERCENT" {
            return max(0, product.price - product.price * d.value / 100)
        } else {
            return max(0, product.price - d.value)
        }
    }

    private var discountLabel: String? {
        guard let d = discount else { return nil }
        return d.type == "PERCENT" ? "\(d.value)%OFF" : "¥\(d.value)OFF"
    }

    private var isDiscounted: Bool { discount != nil }

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .topLeading) {
                // カード本体
                VStack(alignment: .leading, spacing: 4) {
                    Spacer(minLength: 0)

                    Text(product.name)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(product.isAvailable ? Color.primary : Color.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if isDiscounted {
                        Text("¥\(product.price.formatted())")
                            .font(.caption)
                            .strikethrough(true, color: .secondary)
                            .foregroundStyle(Color.secondary)
                    }

                    Text("¥\(effectivePrice.formatted())")
                        .font(.footnote.bold())
                        .foregroundStyle(isDiscounted ? Color.appSuccess : Color.appPrimary)
                }
                .padding(10)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // 割引バッジ（左上）
                if let label = discountLabel {
                    Text(label)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.appSuccess)
                        .clipShape(Capsule())
                        .padding(6)
                }

                // SOLD OUT バッジ（左上、割引より優先）
                if !product.isAvailable {
                    Text("SOLD OUT")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.appError)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .padding(6)
                }

                // カート数バッジ（右上）
                if cartQuantity > 0 {
                    Text("\(cartQuantity)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(minWidth: 20, minHeight: 20)
                        .background(Color.appPrimary)
                        .clipShape(Circle())
                        .padding(6)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                }
            }
            .aspectRatio(1, contentMode: .fit)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color(.systemGray5), lineWidth: 0.5)
            )
            .opacity(product.isAvailable ? 1.0 : 0.5)
        }
        .disabled(!product.isAvailable)
        .accessibilityLabel("\(product.name), ¥\(effectivePrice.formatted())")
        .accessibilityHint(product.isAvailable ? "タップして追加" : "在庫なし")
    }
}

#Preview {
    NavigationStack {
        OrderInputView(orgId: "preview-org")
    }
    .environment(POSViewModel())
}
