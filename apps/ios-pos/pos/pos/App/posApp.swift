import SwiftUI
import SwiftData
import LocalAuthentication

@main
struct posApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @State private var authViewModel = AuthViewModel()

    // iOS-3-054: 生体認証ロック
    @AppStorage(Constants.UserDefaultsKeys.biometricLockEnabled)
    private var biometricLockEnabled = false
    @State private var isLocked = false

    // iOS-3-055: ダークモード
    @AppStorage(Constants.UserDefaultsKeys.appearanceMode)
    private var appearanceMode: Int = 0

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            CachedCategory.self,
            CachedProduct.self,
            CachedDiscount.self
        ])
        // 開発中: スキーマ変更時に既存ストアを破棄して再作成する
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            // スキーマ変更による移行失敗時は既存ストアを削除して再作成する
            let storeURL = URL.applicationSupportDirectory.appending(path: "default.store")
            let storeWalURL = storeURL.appendingPathExtension("wal")
            let storeShmURL = storeURL.appendingPathExtension("shm")
            try? FileManager.default.removeItem(at: storeURL)
            try? FileManager.default.removeItem(at: storeWalURL)
            try? FileManager.default.removeItem(at: storeShmURL)
            do {
                return try ModelContainer(for: schema, configurations: [modelConfiguration])
            } catch {
                fatalError("Could not create ModelContainer: \(error)")
            }
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authViewModel)
                .preferredColorScheme(AppearanceMode(rawValue: appearanceMode)?.colorScheme)
                .overlay {
                    if isLocked {
                        biometricLockOverlay
                    }
                }
        }
        .modelContainer(sharedModelContainer)
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .active:
                warmUpTapToPayIfNeeded()
                if isLocked {
                    authenticateToUnlock()
                }
            case .background:
                if biometricLockEnabled && authViewModel.appState == .main {
                    isLocked = true
                }
            default:
                break
            }
        }
        .onChange(of: authViewModel.appState) { _, newState in
            if newState == .main {
                warmUpTapToPayIfNeeded()
            }
            // ログアウト時はロック解除
            if newState == .login {
                isLocked = false
            }
        }
    }

    // MARK: - 生体認証ロック (iOS-3-054)

    private var biometricLockOverlay: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)
                Text("ロックされています")
                    .font(.headline)
                Button {
                    authenticateToUnlock()
                } label: {
                    Label("ロック解除", systemImage: AuthViewModel.biometrySymbolName)
                        .font(.body.bold())
                }
                .buttonStyle(.borderedProminent)
                .tint(.appPrimary)
            }
        }
        .accessibilityLabel("アプリがロックされています。生体認証でロックを解除してください。")
    }

    private func authenticateToUnlock() {
        let context = LAContext()
        var error: NSError?
        // パスコードフォールバック付きで認証（生体認証失敗後も解除可能）
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            isLocked = false
            return
        }
        Task { @MainActor in
            do {
                let success = try await context.evaluatePolicy(
                    .deviceOwnerAuthentication,
                    localizedReason: "アプリのロックを解除します"
                )
                if success {
                    isLocked = false
                }
            } catch {
                // キャンセル時はロック維持
            }
        }
    }

    // MARK: - Tap to Pay warm-up (iOS-3-013)

    /// TTP を一度でも有効化済みの場合のみ自動接続を試みる。
    /// 未有効化の場合に呼ぶと Apple の T&C スプラッシュが毎回表示されるため、
    /// ttpOnboardingCompleted フラグで制御する。
    private func warmUpTapToPayIfNeeded() {
        guard authViewModel.appState == .main,
              authViewModel.hasTapToPayPermission,
              UserDefaults.standard.bool(forKey: Constants.UserDefaultsKeys.ttpOnboardingCompleted)
        else { return }

        let service = TapToPayService.shared
        if case .disconnected = service.connectionStatus {
            Task {
                try? await service.discoverAndConnect(
                    locationId: Constants.Stripe.locationId
                )
            }
        }
    }
}
