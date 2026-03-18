import Foundation

// MARK: - POSDestination

enum POSDestination: Hashable {
    case orderConfirm
    case cashPayment
    case payPayPayment
    case tapToPayPayment
    case paymentComplete(transactionId: String, paymentMethod: String, receivedAmount: Int?)
}

// MARK: - CartItem

struct CartItem: Identifiable {
    var id: String { productId }
    let productId: String
    let name: String
    let price: Int             // 元の価格（割引前）
    let discountedPrice: Int?  // 自動適用割引後の価格（nil = 割引なし）
    var quantity: Int

    var effectivePrice: Int { discountedPrice ?? price }
}

// MARK: - POSViewModel

@MainActor
@Observable
final class POSViewModel {

    // MARK: - カート状態

    var cartItems: [CartItem] = []
    var selectedCategoryId: String? = nil   // nil = すべて
    var isCartPresented = false

    // MARK: - カート操作

    /// 商品をカートに追加する（既存なら数量 +1）
    /// - Parameter discountedPrice: 自動適用割引後の価格。nil の場合は割引なし
    func addToCart(_ product: CachedProduct, discountedPrice: Int? = nil) {
        if let index = cartItems.firstIndex(where: { $0.productId == product.id }) {
            cartItems[index].quantity += 1
        } else {
            cartItems.append(CartItem(
                productId: product.id,
                name: product.name,
                price: product.price,
                discountedPrice: discountedPrice,
                quantity: 1
            ))
        }
    }

    func increaseQuantity(_ productId: String) {
        guard let index = cartItems.firstIndex(where: { $0.productId == productId }) else { return }
        cartItems[index].quantity += 1
    }

    /// 数量を 1 減らす。0 になった場合は自動的にカートから削除する
    func decreaseQuantity(_ productId: String) {
        guard let index = cartItems.firstIndex(where: { $0.productId == productId }) else { return }
        if cartItems[index].quantity <= 1 {
            cartItems.remove(at: index)
        } else {
            cartItems[index].quantity -= 1
        }
    }

    func removeFromCart(_ productId: String) {
        cartItems.removeAll { $0.productId == productId }
    }

    func clearCart() {
        cartItems = []
    }

    // MARK: - 集計（簡易表示用。正確な合計は /calculate API を使う）

    var totalItemCount: Int {
        cartItems.reduce(0) { $0 + $1.quantity }
    }

    /// カート内の小計（自動割引適用後の単純合計）
    var subtotalPrice: Int {
        cartItems.reduce(0) { $0 + $1.effectivePrice * $1.quantity }
    }

    // MARK: - ナビゲーション（NavigationStack path）

    /// NavigationStack のパス。POSTabView の NavigationStack(path:) に渡す
    var navigationPath: [POSDestination] = []
    /// 現在選択中の組織ID（calculate API 呼び出し等で使用）
    var currentOrgId: String = ""

    // MARK: - 会計計算

    var calculationResult: CalculationResult? = nil
    var isCalculating = false
    var calculateError: String? = nil
    var selectedManualDiscountId: String? = nil

    /// タッチ決済でエラーが発生した場合に true にし、ボタンをグレーアウトする
    var isTapToPayDisabled = false

    /// /calculate API を呼び出して合計金額を取得する
    func fetchCalculation(orgId: String) async {
        guard !cartItems.isEmpty else { return }
        isCalculating = true
        calculateError = nil
        let items = cartItems.map {
            CalculationRequestItem(productId: $0.productId, quantity: $0.quantity)
        }
        do {
            calculationResult = try await ProductService.shared.calculate(
                orgId: orgId,
                items: items,
                manualDiscountId: selectedManualDiscountId
            )
        } catch {
            calculateError = error.localizedDescription
        }
        isCalculating = false
    }

    /// 手動割引を設定して再計算する
    func setManualDiscount(_ discountId: String?, orgId: String) async {
        selectedManualDiscountId = discountId
        await fetchCalculation(orgId: orgId)
    }

    /// 会計完了後に状態をリセットする
    func completeOrder() {
        clearCart()
        calculationResult = nil
        selectedManualDiscountId = nil
        calculateError = nil
        isTapToPayDisabled = false
        navigationPath.removeAll()
    }
}
