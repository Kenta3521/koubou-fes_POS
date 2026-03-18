import SwiftUI

/// TTP オンボーディング スプラッシュ画面 (iOS-3-020 / 021 / 022)
///
/// 初回起動時にフルスクリーンモーダルで表示。
/// 「タッチ決済を始める」→ 権限チェック → discoverAndConnect → 教育画面へ遷移。
struct TTPSplashView: View {
    @Environment(AuthViewModel.self) private var authVM
    @Environment(\.dismiss) private var dismiss

    @AppStorage(Constants.UserDefaultsKeys.ttpOnboardingCompleted)
    private var ttpOnboardingCompleted = false

    @AppStorage(Constants.UserDefaultsKeys.ttpSplashDismissed)
    private var ttpSplashDismissed = false

    @State private var showEducation = false
    @State private var showNoPermissionAlert = false
    @State private var isConnecting = false
    @State private var connectionError: String?
    @State private var showSetupProgress = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Spacer()

                // ヒーローイメージ
                ZStack {
                    Circle()
                        .fill(Color.appPrimary.opacity(0.1))
                        .frame(width: 160, height: 160)

                    Image(systemName: "creditcard.and.123")
                        .font(.system(size: 64))
                        .foregroundStyle(Color.appPrimary)
                }
                .padding(.bottom, 32)

                // 見出し
                Text("iPhoneのタッチ決済が\n利用できます")
                    .font(.title.bold())
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 12)

                // 説明文
                Text("お客様のクレジットカードやApple Payで\nかんたんに決済できます。")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 24)

                // 対応カードリスト
                HStack(spacing: 16) {
                    cardBadge("Visa")
                    cardBadge("Mastercard")
                    cardBadge("Amex")
                    cardBadge("Apple Pay")
                }
                .padding(.bottom, 8)

                Spacer()

                // ボタン群
                VStack(spacing: 12) {
                    // タッチ決済を始める
                    Button {
                        Task { await startTapToPay() }
                    } label: {
                        Group {
                            if isConnecting {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("タッチ決済を始める")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.appPrimary)
                    .disabled(isConnecting)

                    // あとで設定する
                    Button {
                        ttpSplashDismissed = true
                        dismiss()
                    } label: {
                        Text("あとで設定する")
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isConnecting)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
            .navigationBarHidden(true)
            .overlay {
                if showSetupProgress {
                    TTPSetupProgressView()
                }
            }
            .navigationDestination(isPresented: $showEducation) {
                TTPEducationView(isStandalone: false) {
                    ttpOnboardingCompleted = true
                    ttpSplashDismissed = true
                    dismiss()
                }
            }
            .alert("権限が必要です", isPresented: $showNoPermissionAlert) {
                Button("OK") { dismiss() }
            } message: {
                Text("タッチ決済を利用するには管理者から権限を付与してもらう必要があります。")
            }
            .alert("接続エラー", isPresented: .init(
                get: { connectionError != nil },
                set: { if !$0 { connectionError = nil } }
            )) {
                Button("OK") { connectionError = nil }
            } message: {
                Text(connectionError ?? "")
            }
        }
    }

    // MARK: - Actions

    private func startTapToPay() async {
        // iOS-3-021: 権限チェック
        guard authVM.hasTapToPayPermission else {
            showNoPermissionAlert = true
            return
        }

        isConnecting = true
        showSetupProgress = true
        defer {
            isConnecting = false
            showSetupProgress = false
        }

        // iOS-3-022: discoverAndConnect → Apple T&C (SDK 処理)
        do {
            try await TapToPayService.shared.discoverAndConnect(
                locationId: Constants.Stripe.locationId
            )
            showEducation = true
        } catch {
            connectionError = error.localizedDescription
        }
    }

    // MARK: - Subviews

    private func cardBadge(_ name: String) -> some View {
        Text(name)
            .font(.caption2.weight(.medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.quaternary, in: Capsule())
    }
}

#Preview {
    TTPSplashView()
        .environment(AuthViewModel())
}
