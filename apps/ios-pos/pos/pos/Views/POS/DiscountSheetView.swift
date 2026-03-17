import SwiftUI

struct DiscountSheetView: View {
    @Environment(\.dismiss) private var dismiss
    let discounts: [CachedDiscount]
    let selectedDiscountId: String?
    /// 適用可否チェックに使う現在の小計（税抜き計算前の合計）
    let currentTotal: Int
    let onSelect: (String?) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    // 割引なしカード
                    DiscountCard(
                        title: "割引なし",
                        badge: nil,
                        condition: nil,
                        isSelected: selectedDiscountId == nil,
                        isApplicable: true,
                        isRemoveCard: false
                    ) {
                        onSelect(nil)
                        dismiss()
                    }

                    if !discounts.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("利用可能な割引")
                                .font(.caption)
                                .foregroundStyle(Color.secondary)
                                .padding(.horizontal, 4)

                            ForEach(discounts) { discount in
                                let applicable = isApplicable(discount)
                                DiscountCard(
                                    title: discount.name,
                                    badge: badgeText(for: discount),
                                    condition: conditionText(for: discount),
                                    isSelected: selectedDiscountId == discount.id,
                                    isApplicable: applicable,
                                    isRemoveCard: false
                                ) {
                                    guard applicable else { return }
                                    onSelect(discount.id)
                                    dismiss()
                                }
                            }
                        }
                    }
                }
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("割引を選択")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("閉じる") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Helpers

    private func isApplicable(_ discount: CachedDiscount) -> Bool {
        switch discount.conditionType {
        case "MIN_AMOUNT":
            return currentTotal >= discount.conditionValue
        case "MIN_QUANTITY":
            // OrderConfirmView では合計アイテム数が不明なため現時点では常に許可
            return true
        default:
            return true
        }
    }

    private func badgeText(for discount: CachedDiscount) -> String {
        discount.type == "PERCENT" ? "\(discount.value)%OFF" : "¥\(discount.value)引き"
    }

    private func conditionText(for discount: CachedDiscount) -> String? {
        switch discount.conditionType {
        case "MIN_AMOUNT":
            return "¥\(discount.conditionValue.formatted())以上のご注文"
        case "MIN_QUANTITY":
            return "\(discount.conditionValue)個以上のご注文"
        default:
            return nil
        }
    }
}

// MARK: - DiscountCard

private struct DiscountCard: View {
    let title: String
    let badge: String?
    let condition: String?
    let isSelected: Bool
    let isApplicable: Bool
    let isRemoveCard: Bool
    let action: () -> Void

    private var borderColor: Color {
        if isSelected { return Color.appSuccess }
        return Color(.systemGray4)
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(isApplicable ? Color.primary : Color.secondary)
                    if let condition {
                        Text(condition)
                            .font(.caption)
                            .foregroundStyle(isApplicable ? Color.appSuccess : Color.secondary)
                    }
                }
                Spacer()
                if let badge {
                    Text(badge)
                        .font(.caption.bold())
                        .foregroundStyle(isApplicable ? Color.appSuccess : Color.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            (isApplicable ? Color.appSuccess : Color.secondary).opacity(0.1)
                        )
                        .clipShape(Capsule())
                }
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.appSuccess)
                        .font(.title3)
                }
            }
            .padding(14)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(borderColor, lineWidth: isSelected ? 2 : 0.5)
            )
        }
        .disabled(!isApplicable)
        .opacity(isApplicable ? 1.0 : 0.5)
        .accessibilityLabel(title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

#Preview {
    DiscountSheetView(
        discounts: [
            CachedDiscount(
                id: "1", organizationId: "org", name: "学割10%OFF",
                type: "PERCENT", value: 10, isActive: true,
                conditionType: "MIN_AMOUNT", conditionValue: 500,
                triggerType: "MANUAL", targetType: "ORDER_TOTAL"
            ),
            CachedDiscount(
                id: "2", organizationId: "org", name: "¥100引き",
                type: "FIXED", value: 100, isActive: true,
                conditionType: "NONE", conditionValue: 0,
                triggerType: "MANUAL", targetType: "ORDER_TOTAL"
            )
        ],
        selectedDiscountId: "2",
        currentTotal: 400
    ) { _ in }
}
