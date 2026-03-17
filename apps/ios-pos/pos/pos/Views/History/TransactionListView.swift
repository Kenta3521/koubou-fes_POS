import SwiftUI

struct TransactionListView: View {
    let orgId: String

    @State private var viewModel = TransactionHistoryViewModel()
    @State private var selectedTransaction: TransactionSummary? = nil
    @State private var isFilterExpanded = false

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.transactions.isEmpty {
                    loadingView
                } else {
                    listContent
                }
            }
            .navigationTitle("取引履歴")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        withAnimation { isFilterExpanded.toggle() }
                    } label: {
                        Image(systemName: isFilterExpanded ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                            .foregroundStyle(hasActiveFilter ? Color.appPrimary : Color.primary)
                    }
                    .accessibilityLabel("フィルタ")
                }
            }
            .task {
                await viewModel.fetchTransactions(orgId: orgId)
            }
            .sheet(item: $selectedTransaction) { txn in
                TransactionDetailView(orgId: orgId, transactionId: txn.id)
            }
        }
    }

    // MARK: - リストコンテンツ

    private var listContent: some View {
        List {
            // フィルタパネル
            if isFilterExpanded {
                filterSection
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color(.systemGroupedBackground))
            }

            // 件数表示
            if !viewModel.transactions.isEmpty {
                Section {
                    EmptyView()
                } header: {
                    Text("\(viewModel.transactions.count)件の取引")
                        .font(.caption)
                        .foregroundStyle(Color.secondary)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
            }

            // 取引行
            if viewModel.transactions.isEmpty {
                emptyView
            } else {
                Section {
                    ForEach(viewModel.transactions) { txn in
                        TransactionRow(transaction: txn)
                            .contentShape(Rectangle())
                            .onTapGesture { selectedTransaction = txn }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable {
            await viewModel.fetchTransactions(orgId: orgId)
        }
        .overlay {
            if let error = viewModel.errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(Color.appError)
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(Color.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    Button("再試行") {
                        Task { await viewModel.fetchTransactions(orgId: orgId) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.appPrimary)
                }
            }
        }
    }

    // MARK: - フィルタセクション

    private var filterSection: some View {
        VStack(spacing: 0) {
            // ステータス
            filterRow(label: "ステータス") {
                Picker("ステータス", selection: $viewModel.statusFilter) {
                    Text("全て").tag("ALL")
                    Text("完了").tag("COMPLETED")
                    Text("キャンセル").tag("CANCELLED")
                    Text("保留中").tag("PENDING")
                }
                .pickerStyle(.menu)
            }

            Divider().padding(.leading, 16)

            // 支払方法
            filterRow(label: "支払方法") {
                Picker("支払方法", selection: $viewModel.paymentMethodFilter) {
                    Text("全て").tag("ALL")
                    Text("現金").tag("CASH")
                    Text("PayPay").tag("PAYPAY")
                }
                .pickerStyle(.menu)
            }

            Divider().padding(.leading, 16)

            // 日付
            filterRow(label: "日付") {
                HStack {
                    if let date = viewModel.dateFilter {
                        Text(date.formatted(date: .abbreviated, time: .omitted))
                            .foregroundStyle(Color.primary)
                        Button {
                            viewModel.dateFilter = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.secondary)
                        }
                    } else {
                        DatePicker("", selection: Binding(
                            get: { viewModel.dateFilter ?? Date() },
                            set: { viewModel.dateFilter = $0 }
                        ), displayedComponents: .date)
                        .labelsHidden()
                    }
                }
            }

            // リセットボタン
            if hasActiveFilter {
                Button {
                    viewModel.resetFilters()
                } label: {
                    Label("フィルタをリセット", systemImage: "arrow.counterclockwise")
                        .font(.subheadline)
                        .foregroundStyle(Color.appError)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
        .onChange(of: viewModel.statusFilter) { _, _ in
            Task { await viewModel.fetchTransactions(orgId: orgId) }
        }
        .onChange(of: viewModel.paymentMethodFilter) { _, _ in
            Task { await viewModel.fetchTransactions(orgId: orgId) }
        }
        .onChange(of: viewModel.dateFilter) { _, _ in
            Task { await viewModel.fetchTransactions(orgId: orgId) }
        }
    }

    @ViewBuilder
    private func filterRow<Content: View>(label: String, @ViewBuilder trailing: () -> Content) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
                .frame(width: 72, alignment: .leading)
            Spacer()
            trailing()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - ロード中

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("読み込み中...")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - 空状態

    private var emptyView: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock.badge.xmark")
                .font(.system(size: 48))
                .foregroundStyle(Color(.systemGray3))
            Text("取引が見つかりません")
                .font(.subheadline)
                .foregroundStyle(Color.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .listRowBackground(Color.clear)
    }

    // MARK: - フィルタ有効判定

    private var hasActiveFilter: Bool {
        viewModel.statusFilter != "ALL"
            || viewModel.paymentMethodFilter != "ALL"
            || viewModel.dateFilter != nil
    }
}

// MARK: - TransactionRow

private struct TransactionRow: View {
    let transaction: TransactionSummary

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            // 左: 日時 + 担当者
            VStack(alignment: .leading, spacing: 4) {
                Text(formattedDate)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.primary)
                Text(transaction.user.name)
                    .font(.caption)
                    .foregroundStyle(Color.secondary)
            }

            Spacer()

            // 右: 支払方法バッジ + 金額 + ステータス
            VStack(alignment: .trailing, spacing: 4) {
                Text("¥\(transaction.totalAmount.formatted())")
                    .font(.subheadline.bold())
                    .foregroundStyle(Color.primary)
                HStack(spacing: 6) {
                    paymentBadge
                    statusBadge
                }
            }

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color(.systemGray3))
        }
        .padding(.vertical, 4)
        .accessibilityLabel("\(formattedDate)、\(transaction.user.name)、¥\(transaction.totalAmount.formatted())、\(paymentLabel)、\(statusLabel)")
    }

    private var formattedDate: String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = parser.date(from: transaction.createdAt) else {
            return transaction.createdAt
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ja_JP")
        formatter.dateFormat = "yyyy/MM/dd HH:mm:ss"
        return formatter.string(from: date)
    }

    private var paymentLabel: String {
        switch transaction.paymentMethod {
        case "CASH":       return "現金"
        case "PAYPAY":     return "PayPay"
        case "TAP_TO_PAY": return "タッチ決済"
        default:           return transaction.paymentMethod
        }
    }

    private var statusLabel: String {
        switch transaction.status {
        case "COMPLETED": return "完了"
        case "CANCELLED": return "キャンセル"
        case "PENDING":   return "保留中"
        default:          return transaction.status
        }
    }

    private var paymentBadge: some View {
        Text(paymentLabel)
            .font(.caption2.weight(.medium))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color(.systemGray5))
            .foregroundStyle(Color.secondary)
            .clipShape(Capsule())
    }

    private var statusBadge: some View {
        let (color, bg): (Color, Color) = {
            switch transaction.status {
            case "COMPLETED": return (.white, Color.appSuccess)
            case "CANCELLED": return (.white, Color.appError)
            case "PENDING":   return (Color.appWarning, Color.appWarning.opacity(0.15))
            default:          return (Color.secondary, Color(.systemGray5))
            }
        }()
        return Text(statusLabel)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(bg)
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}

// MARK: - Preview

#Preview {
    TransactionListView(orgId: "preview-org")
}
