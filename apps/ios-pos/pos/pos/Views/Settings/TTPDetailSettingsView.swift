import SwiftUI

/// タッチ決済の詳細設定画面
///
/// 設定画面のアプリ設定セクションからナビゲーションで遷移する。
/// 有効化/無効化、使い方、Apple Account 紐付け解除リンクを提供する。
struct TTPDetailSettingsView: View {
    @Environment(AuthViewModel.self) private var authVM
    @State private var viewModel = SettingsViewModel()

    var body: some View {
        Form {
            connectionSection
            resourcesSection
        }
        .navigationTitle("タッチ決済設定")
        .navigationBarTitleDisplayMode(.inline)
        .alert("エラー", isPresented: .init(
            get: { viewModel.ttpError != nil },
            set: { if !$0 { viewModel.ttpError = nil } }
        )) {
            Button("OK") { viewModel.ttpError = nil }
        } message: {
            Text(viewModel.ttpError ?? "")
        }
    }

    // MARK: - 接続状態・操作セクション

    private var connectionSection: some View {
        Section {
            // ステータス表示
            HStack {
                Label("ステータス", systemImage: "wave.3.right")
                Spacer()
                ttpStatusBadge
            }

            // 有効化 / 無効化ボタン
            switch TapToPayService.shared.connectionStatus {
            case .connected:
                Button {
                    Task { await viewModel.disconnectTapToPay() }
                } label: {
                    Label("タッチ決済を無効化する", systemImage: "xmark.circle")
                        .foregroundStyle(Color.appError)
                }
            case .discovering, .connecting:
                HStack {
                    ProgressView()
                        .controlSize(.small)
                    Text("接続中...")
                        .foregroundStyle(.secondary)
                }
            default:
                Button {
                    Task { await viewModel.connectTapToPay() }
                } label: {
                    Label("タッチ決済を有効化する", systemImage: "checkmark.circle")
                        .foregroundStyle(Color.appPrimary)
                }
                .disabled(viewModel.isConnectingTTP)
            }
        } header: {
            Text("タッチ決済")
        } footer: {
            Text("タッチ決済を有効化すると、レジ画面でクレジットカードやApple Payでの決済が利用できます。")
        }
    }

    @ViewBuilder
    private var ttpStatusBadge: some View {
        let status = TapToPayService.shared.connectionStatus
        switch status {
        case .disconnected:
            Label("未接続", systemImage: "circle")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        case .discovering, .connecting:
            Label("接続中...", systemImage: "ellipsis.circle")
                .font(.subheadline)
                .foregroundStyle(Color.appWarning)
        case .connected:
            Label("接続済み", systemImage: "checkmark.circle.fill")
                .font(.subheadline)
                .foregroundStyle(Color.appSuccess)
        case .error:
            Label("エラー", systemImage: "exclamationmark.triangle.fill")
                .font(.subheadline)
                .foregroundStyle(Color.appError)
        }
    }

    // MARK: - リソースセクション

    private var resourcesSection: some View {
        Section {
            NavigationLink {
                TTPEducationView(isStandalone: true)
            } label: {
                Label("タッチ決済の使い方", systemImage: "book")
            }

            if let url = URL(string: "https://businessconnect.apple.com/taptopay/removeall") {
                Link(destination: url) {
                    HStack {
                        Label("アカウントの紐付けを解除", systemImage: "person.crop.circle.badge.minus")
                            .foregroundStyle(Color.appError)
                        Spacer()
                        Image(systemName: "arrow.up.right.square")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        } header: {
            Text("サポート")
        } footer: {
            Text("アカウントの紐付けを解除すると、このデバイスでのタッチ決済が無効になります。再度利用するには紐付けが必要です。")
        }
    }
}

#Preview {
    NavigationStack {
        TTPDetailSettingsView()
    }
    .environment(AuthViewModel())
}
