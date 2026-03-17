import SwiftUI

struct TransactionDetailView: View {
    let orgId: String
    let transactionId: String

    @Environment(\.dismiss) private var dismiss

    @State private var detail: TransactionDetail? = nil
    @State private var isLoading = true
    @State private var errorMessage: String? = nil

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    loadingView
                } else if let error = errorMessage {
                    errorView(error)
                } else if let txn = detail {
                    mainContent(txn)
                }
            }
            .navigationTitle("取引詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.secondary)
                    }
                    .accessibilityLabel("閉じる")
                }
            }
            .task { await loadDetail() }
        }
    }

    // MARK: - メインコンテンツ

    private func mainContent(_ txn: TransactionDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {

                // 取引ID
                Text("取引ID: \(txn.id)")
                    .font(.caption)
                    .foregroundStyle(Color.secondary)
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 16)

                // 情報グリッド（4列）
                infoGrid(txn)
                    .padding(.horizontal, 16)

                Divider().padding(.vertical, 20)

                // 購入商品
                itemsSection(txn)
                    .padding(.horizontal, 16)

                // 適用された割引
                let discounts = appliedDiscounts(txn)
                if !discounts.isEmpty {
                    Divider().padding(.vertical, 20)
                    discountsSection(discounts)
                        .padding(.horizontal, 16)
                }

                // サマリー
                Divider().padding(.vertical, 20)
                summarySection(txn)
                    .padding(.horizontal, 16)

                Spacer().frame(height: 24)
            }
        }
        .background(Color(.systemBackground))
    }

    // MARK: - 情報グリッド（4列）

    private func infoGrid(_ txn: TransactionDetail) -> some View {
        Grid(horizontalSpacing: 0, verticalSpacing: 0) {
            GridRow {
                infoCell(label: "日時", value: formattedDate(txn.createdAt))
                infoCell(label: "担当者", value: txn.user.name)
                infoCell(label: "決済方法", value: paymentLabel(txn.paymentMethod))
                infoCellBadge(label: "ステータス", status: txn.status)
            }
        }
    }

    private func infoCell(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(Color.secondary)
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.primary)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func infoCellBadge(label: String, status: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(Color.secondary)
            statusBadge(status)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - 購入商品テーブル

    private func itemsSection(_ txn: TransactionDetail) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("購入商品")
                .font(.headline)

            VStack(spacing: 0) {
                // テーブルヘッダー
                HStack {
                    Text("商品名")
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text("単価")
                        .frame(width: 56, alignment: .trailing)
                    Text("数量")
                        .frame(width: 36, alignment: .trailing)
                    Text("小計")
                        .frame(width: 68, alignment: .trailing)
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.secondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .intersection(Rectangle().offset(y: 0)))

                Divider()

                ForEach(Array(txn.items.enumerated()), id: \.element.id) { index, item in
                    if index > 0 { Divider().padding(.horizontal, 12) }
                    HStack(alignment: .top, spacing: 4) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.product.name)
                                .font(.subheadline)
                            if let d = item.discount, item.discountAmount > 0 {
                                Text("(割引: \(d.name) -¥\(item.discountAmount.formatted()))")
                                    .font(.caption)
                                    .foregroundStyle(Color.appError)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Text("¥\(item.unitPrice.formatted())")
                            .font(.subheadline)
                            .frame(width: 56, alignment: .trailing)
                        Text("\(item.quantity)")
                            .font(.subheadline)
                            .frame(width: 36, alignment: .trailing)
                        Text("¥\((item.unitPrice * item.quantity).formatted())")
                            .font(.subheadline.bold())
                            .frame(width: 68, alignment: .trailing)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                }
            }
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color(.systemGray4), lineWidth: 0.5)
            )
        }
    }

    // MARK: - 適用された割引

    private func discountsSection(_ discounts: [DiscountEntry]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("適用された割引")
                .font(.headline)

            VStack(spacing: 0) {
                ForEach(Array(discounts.enumerated()), id: \.offset) { index, d in
                    if index > 0 { Divider().padding(.horizontal, 12) }
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(d.name)
                                .font(.subheadline.weight(.medium))
                            ForEach(Array(d.details.enumerated()), id: \.offset) { _, detail in
                                Text(detail.description)
                                    .font(.caption)
                                    .foregroundStyle(Color.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Text("-¥\(d.amount.formatted())")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.appError)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                }
            }
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color(.systemGray4), lineWidth: 0.5)
            )
        }
    }

    // MARK: - 合計サマリー

    private func summarySection(_ txn: TransactionDetail) -> some View {
        let subtotal = txn.items.reduce(0) { $0 + $1.originalPrice * $1.quantity }

        return VStack(spacing: 0) {
            summaryRow(label: "小計（割引前）",
                       value: "¥\(subtotal.formatted())",
                       labelFont: .subheadline,
                       valueFont: .subheadline,
                       valueColor: Color.primary)
            summaryRow(label: "割引合計",
                       value: "-¥\(txn.discountAmount.formatted())",
                       labelFont: .subheadline,
                       valueFont: .subheadline,
                       valueColor: Color.appError,
                       labelColor: Color.appError)
            Divider().padding(.top, 8)
            summaryRow(label: "合計金額",
                       value: "¥\(txn.totalAmount.formatted())",
                       labelFont: .title3.bold(),
                       valueFont: .title3.bold(),
                       valueColor: Color.primary)
        }
    }

    private func summaryRow(
        label: String,
        value: String,
        labelFont: Font,
        valueFont: Font,
        valueColor: Color,
        labelColor: Color = Color.secondary
    ) -> some View {
        HStack {
            Text(label)
                .font(labelFont)
                .foregroundStyle(labelColor)
            Spacer()
            Text(value)
                .font(valueFont)
                .foregroundStyle(valueColor)
        }
        .padding(.vertical, 6)
    }

    // MARK: - ローディング / エラー

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().scaleEffect(1.5)
            Text("読み込み中...")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.appError)
            Text("取引を読み込めませんでした")
                .font(.headline)
            Text(message)
                .font(.caption)
                .foregroundStyle(Color.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - ヘルパー

    private func formattedDate(_ iso: String) -> String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = parser.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "ja_JP")
        f.dateFormat = "yyyy/MM/dd HH:mm:ss"
        return f.string(from: date)
    }

    private func paymentLabel(_ method: String) -> String {
        switch method {
        case "CASH":       return "現金"
        case "PAYPAY":     return "PayPay"
        case "TAP_TO_PAY": return "タッチ決済"
        default:           return method
        }
    }

    @ViewBuilder
    private func statusBadge(_ status: String) -> some View {
        let (label, fg, bg): (String, Color, Color) = {
            switch status {
            case "COMPLETED": return ("完了", .white, Color.appSuccess)
            case "CANCELLED": return ("キャンセル", .white, Color.appError)
            case "PENDING":   return ("保留中", Color.appWarning, Color.appWarning.opacity(0.15))
            default:          return (status, Color.secondary, Color(.systemGray5))
            }
        }()
        Text(label)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bg)
            .foregroundStyle(fg)
            .clipShape(Capsule())
    }

    // MARK: - 割引集計（Web版 getAppliedDiscounts() ロジックを移植）

    private struct DiscountEntry {
        let name: String
        var amount: Int
        var details: [DiscountDetail]
        struct DiscountDetail { let description: String }
    }

    private func appliedDiscounts(_ txn: TransactionDetail) -> [DiscountEntry] {
        var map: [(key: String, value: DiscountEntry)] = []

        func upsert(key: String, name: String, amount: Int, detail: DiscountEntry.DiscountDetail) {
            if let idx = map.firstIndex(where: { $0.key == key }) {
                map[idx].value.amount += amount
                map[idx].value.details.append(detail)
            } else {
                map.append((key: key, value: DiscountEntry(name: name, amount: amount, details: [detail])))
            }
        }

        // item-level 割引
        for item in txn.items where item.discountAmount > 0 {
            guard let d = item.discount else { continue }
            let total = item.discountAmount * item.quantity
            let desc: String
            if d.type == "FIXED" {
                desc = "-¥\(item.discountAmount.formatted()) × \(item.quantity)"
            } else if d.type == "PERCENT" {
                desc = "\(d.value)% 割引 (数量: \(item.quantity))"
            } else {
                desc = "-¥\(total.formatted())"
            }
            upsert(key: d.id, name: d.name, amount: total, detail: .init(description: desc))
        }

        // order-level 割引（残差）
        let itemTotal = txn.items.reduce(0) { $0 + $1.discountAmount * $1.quantity }
        let remainder = txn.discountAmount - itemTotal
        if remainder > 0 {
            if let d = txn.discount {
                let desc: String
                if d.type == "FIXED" {
                    desc = "-¥\(remainder.formatted())"
                } else if d.type == "PERCENT" {
                    desc = "\(d.value)% 割引"
                } else {
                    desc = "-¥\(remainder.formatted())"
                }
                upsert(key: d.id, name: d.name, amount: remainder, detail: .init(description: desc))
            } else {
                upsert(key: "other", name: "その他の割引", amount: remainder,
                       detail: .init(description: "-¥\(remainder.formatted())"))
            }
        }

        return map.map(\.value)
    }

    // MARK: - データ取得

    private func loadDetail() async {
        isLoading = true
        errorMessage = nil
        do {
            detail = try await TransactionService.shared.fetchTransactionDetail(
                orgId: orgId,
                transactionId: transactionId
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    TransactionDetailView(orgId: "preview-org", transactionId: "preview-txn")
}
