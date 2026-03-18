import SwiftUI

struct CartSheetView: View {
    @Environment(POSViewModel.self) private var posVM
    var availableProductIds: Set<String>
    var onCheckout: () -> Void

    @State private var isValidating = false
    @State private var validationError: String?

    /// カート内の在庫なし/無効商品のID
    private var unavailableItemIds: Set<String> {
        Set(posVM.cartItems.map(\.productId).filter { !availableProductIds.contains($0) })
    }

    private var hasUnavailableItems: Bool {
        !unavailableItemIds.isEmpty
    }

    var body: some View {
        NavigationStack {
            Group {
                if posVM.cartItems.isEmpty {
                    emptyCartView
                } else {
                    cartContentView
                }
            }
            .navigationTitle("カート")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("閉じる") {
                        posVM.isCartPresented = false
                    }
                }
                if !posVM.cartItems.isEmpty {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("クリア", role: .destructive) {
                            posVM.clearCart()
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Empty State

    private var emptyCartView: some View {
        VStack(spacing: 16) {
            Image(systemName: "cart")
                .font(.system(size: 48))
                .foregroundStyle(Color.secondary)

            Text("カートは空です")
                .font(.headline)
                .foregroundStyle(Color.secondary)

            Text("商品を追加してください")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Cart Content

    private var cartContentView: some View {
        VStack(spacing: 0) {
            List {
                ForEach(posVM.cartItems) { item in
                    CartItemRow(item: item, isUnavailable: unavailableItemIds.contains(item.productId))
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        let id = posVM.cartItems[index].productId
                        posVM.removeFromCart(id)
                    }
                }
            }
            .listStyle(.plain)

            checkoutFooter
        }
    }

    // MARK: - Checkout Footer

    private var checkoutFooter: some View {
        VStack(spacing: 0) {
            Divider()

            VStack(spacing: 12) {
                HStack {
                    Text("小計（\(posVM.totalItemCount)点）")
                        .font(.subheadline)
                        .foregroundStyle(Color.secondary)
                    Spacer()
                    Text("¥\(posVM.subtotalPrice.formatted())")
                        .font(.subheadline.bold())
                }

                Text("※ 割引後の合計は次の画面で確認できます")
                    .font(.caption)
                    .foregroundStyle(Color.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if hasUnavailableItems {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Color.appError)
                        Text("在庫なしの商品を削除してください")
                            .font(.caption)
                            .foregroundStyle(Color.appError)
                        Spacer()
                        Button("一括削除") {
                            posVM.cartItems.removeAll { unavailableItemIds.contains($0.productId) }
                        }
                        .font(.caption.bold())
                        .foregroundStyle(Color.appError)
                    }
                }

                if let error = validationError {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Color.appError)
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(Color.appError)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task { await validateAndCheckout() }
                } label: {
                    Group {
                        if isValidating {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("会計に進む")
                        }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(hasUnavailableItems || isValidating ? Color(.systemGray4) : Color.appPrimary)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(hasUnavailableItems || isValidating)
                .accessibilityLabel("会計に進む")
                .accessibilityHint(hasUnavailableItems ? "在庫なしの商品を削除してください" : "注文確認画面へ移動します")
            }
            .padding(16)
            .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - 会計前バリデーション

    private func validateAndCheckout() async {
        isValidating = true
        validationError = nil

        let orgId = posVM.currentOrgId
        let items = posVM.cartItems.map {
            CalculationRequestItem(productId: $0.productId, quantity: $0.quantity)
        }
        do {
            posVM.calculationResult = try await ProductService.shared.calculate(
                orgId: orgId,
                items: items,
                manualDiscountId: posVM.selectedManualDiscountId
            )
            isValidating = false
            onCheckout()
        } catch {
            isValidating = false
            let message = error.localizedDescription
            if message.contains("INSUFFICIENT_STOCK") {
                validationError = "在庫が不足している商品が含まれています。カートを確認してください。"
            } else {
                validationError = "注文の確認中にエラーが発生しました: \(message)"
            }
        }
    }
}

// MARK: - CartItemRow

private struct CartItemRow: View {
    @Environment(POSViewModel.self) private var posVM
    let item: CartItem
    var isUnavailable: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(item.name)
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    if isUnavailable {
                        Text("在庫なし")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.appError)
                            .clipShape(Capsule())
                    }
                }

                // 割引あり: 元値（打ち消し）＋割引後価格
                if let discounted = item.discountedPrice {
                    HStack(spacing: 6) {
                        Text("¥\(item.price.formatted())")
                            .font(.caption)
                            .strikethrough(true, color: .secondary)
                            .foregroundStyle(Color.secondary)
                        Text("¥\(discounted.formatted())")
                            .font(.caption.bold())
                            .foregroundStyle(Color.appSuccess)
                        Text("× \(item.quantity)")
                            .font(.caption)
                            .foregroundStyle(Color.secondary)
                    }
                } else {
                    Text("¥\(item.price.formatted()) × \(item.quantity)")
                        .font(.caption)
                        .foregroundStyle(Color.secondary)
                }
            }

            Spacer()

            // 数量変更ボタン（44×44pt 以上確保 - HIG 準拠）
            // .buttonStyle(.borderless) が必須: List 内では指定しないと行タップに吸収される
            HStack(spacing: 0) {
                Button {
                    posVM.decreaseQuantity(item.productId)
                } label: {
                    Image(systemName: "minus")
                        .font(.subheadline.bold())
                        .frame(width: 44, height: 44)
                        .foregroundStyle(Color.appPrimary)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("数量を減らす")

                Text("\(item.quantity)")
                    .font(.subheadline.bold())
                    .frame(minWidth: 28)
                    .multilineTextAlignment(.center)

                Button {
                    posVM.increaseQuantity(item.productId)
                } label: {
                    Image(systemName: "plus")
                        .font(.subheadline.bold())
                        .frame(width: 44, height: 44)
                        .foregroundStyle(Color.appPrimary)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("数量を増やす")
            }
        }
        .padding(.vertical, 4)
        .sensoryFeedback(.impact(weight: .light), trigger: item.quantity)
    }
}

#Preview {
    CartSheetView(availableProductIds: ["1"], onCheckout: {})
        .environment({
            let vm = POSViewModel()
            vm.cartItems = [
                CartItem(productId: "1", name: "たこ焼き", price: 600, discountedPrice: nil, quantity: 2),
                CartItem(productId: "2", name: "焼きそば", price: 400, discountedPrice: 0, quantity: 1)
            ]
            return vm
        }())
}
