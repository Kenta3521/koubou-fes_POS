import SwiftUI
import LocalAuthentication

struct SettingsView: View {
    @Environment(AuthViewModel.self) private var authVM
    @AppStorage(Constants.UserDefaultsKeys.biometricLockEnabled)
    private var biometricLockEnabled = false

    @AppStorage(Constants.UserDefaultsKeys.appearanceMode)
    private var appearanceMode: Int = 0

    @State private var biometricToggleValue = false
    @State private var biometricInitialized = false
    @State private var biometricError: String?
    @State private var showBiometricSettingsAlert = false
    @State private var showLogoutConfirmation = false

    var body: some View {
        NavigationStack {
            Form {
                userInfoSection
                appSettingsSection
                accountActionsSection
            }
            .navigationTitle("設定")
            .alert("エラー", isPresented: .init(
                get: { biometricError != nil },
                set: { if !$0 { biometricError = nil } }
            )) {
                Button("OK") { biometricError = nil }
            } message: {
                Text(biometricError ?? "")
            }
            .alert("\(AuthViewModel.biometryLabel) の使用が許可されていません", isPresented: $showBiometricSettingsAlert) {
                Button("設定を開く") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("キャンセル", role: .cancel) {}
            } message: {
                Text("「設定」→ このアプリ →「\(AuthViewModel.biometryLabel)」を有効にしてください。")
            }
        }
    }

    // MARK: - ユーザー情報セクション (iOS-3-052)

    private var userInfoSection: some View {
        Section {
            HStack(spacing: 12) {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(authVM.currentUser?.name ?? "---")
                        .font(.headline)
                    Text(authVM.currentUser?.email ?? "---")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)

            LabeledContent("所属団体") {
                Text(authVM.selectedOrganization?.name ?? "未選択")
            }

            LabeledContent("ロール") {
                Text(localizedRole(authVM.selectedOrganization?.role))
            }
        } header: {
            Text("ユーザー情報")
        }
    }

    // MARK: - アプリ設定セクション (iOS-3-054, iOS-3-055)

    private var appSettingsSection: some View {
        Section {
            // 生体認証ロック
            Toggle(isOn: $biometricToggleValue) {
                Label(
                    "\(AuthViewModel.biometryLabel) でロック",
                    systemImage: AuthViewModel.biometrySymbolName
                )
            }
            .onAppear {
                biometricToggleValue = biometricLockEnabled
                biometricInitialized = true
            }
            .onChange(of: biometricToggleValue) { _, newValue in
                guard biometricInitialized else { return }
                Task { await handleBiometricToggle(newValue) }
            }

            // ダークモード
            Picker(selection: $appearanceMode) {
                ForEach(AppearanceMode.allCases, id: \.rawValue) { mode in
                    Text(mode.label).tag(mode.rawValue)
                }
            } label: {
                Label("外観モード", systemImage: "moon.circle")
            }

            // タッチ決済（権限がある場合のみ表示）
            if authVM.hasTapToPayPermission {
                NavigationLink {
                    TTPDetailSettingsView()
                        .environment(authVM)
                } label: {
                    HStack {
                        Label("タッチ決済", systemImage: "wave.3.right")
                        Spacer()
                        ttpStatusBadge
                    }
                }
            }
        } header: {
            Text("アプリ設定")
        }
    }

    @ViewBuilder
    private var ttpStatusBadge: some View {
        let status = TapToPayService.shared.connectionStatus
        switch status {
        case .disconnected:
            Text("未接続")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .discovering, .connecting:
            Text("接続中...")
                .font(.caption)
                .foregroundStyle(Color.appWarning)
        case .connected:
            Text("接続済み")
                .font(.caption)
                .foregroundStyle(Color.appSuccess)
        case .error:
            Text("エラー")
                .font(.caption)
                .foregroundStyle(Color.appError)
        }
    }

    // MARK: - 生体認証トグル制御

    private func handleBiometricToggle(_ newValue: Bool) async {
        let context = LAContext()
        var error: NSError?

        if newValue {
            // ON: 生体認証を評価して、システムの許可ダイアログを表示させる
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                biometricToggleValue = false
                // 権限拒否の場合は設定アプリへ誘導
                if let laError = error as? LAError,
                   laError.code == .biometryNotAvailable || laError.code == .biometryLockout {
                    showBiometricSettingsAlert = true
                } else {
                    biometricError = "\(AuthViewModel.biometryLabel) はこのデバイスで利用できません。"
                }
                return
            }
            do {
                let success = try await context.evaluatePolicy(
                    .deviceOwnerAuthenticationWithBiometrics,
                    localizedReason: "\(AuthViewModel.biometryLabel) でロックを有効にします"
                )
                if success {
                    biometricLockEnabled = true
                } else {
                    biometricToggleValue = false
                }
            } catch {
                biometricToggleValue = false
            }
        } else {
            // OFF: 本人確認のため生体認証を要求
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                // 生体認証が使えない場合はそのまま無効化を許可
                biometricLockEnabled = false
                return
            }
            do {
                let success = try await context.evaluatePolicy(
                    .deviceOwnerAuthenticationWithBiometrics,
                    localizedReason: "\(AuthViewModel.biometryLabel) でロックを解除するには認証が必要です"
                )
                if success {
                    biometricLockEnabled = false
                } else {
                    biometricToggleValue = true
                }
            } catch {
                // 認証失敗・キャンセル → トグルを元に戻す
                biometricToggleValue = true
            }
        }
    }

    // MARK: - 団体切り替え・ログアウトセクション (iOS-3-056, iOS-3-057)

    private var accountActionsSection: some View {
        Section {
            Button {
                authVM.selectedOrganization = nil
                authVM.appState = .orgSelect
            } label: {
                Label("団体を切り替える", systemImage: "arrow.triangle.2.circlepath")
            }

            Button(role: .destructive) {
                showLogoutConfirmation = true
            } label: {
                Text("ログアウト")
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .confirmationDialog(
                "ログアウトしますか？",
                isPresented: $showLogoutConfirmation,
                titleVisibility: .visible
            ) {
                Button("ログアウト", role: .destructive) {
                    authVM.logout()
                }
                Button("キャンセル", role: .cancel) {}
            } message: {
                Text("ログイン画面に戻ります")
            }
        }
    }

    // MARK: - Helpers

    private func localizedRole(_ role: String?) -> String {
        switch role {
        case "SYSTEM_ADMIN": return "システム管理者"
        case "ORG_ADMIN": return "団体管理者"
        case "STAFF": return "スタッフ"
        default: return role ?? "---"
        }
    }
}

#Preview {
    SettingsView()
        .environment(AuthViewModel())
}
