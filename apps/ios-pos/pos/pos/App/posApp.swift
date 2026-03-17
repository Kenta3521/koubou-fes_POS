import SwiftUI
import SwiftData

@main
struct posApp: App {
    @State private var authViewModel = AuthViewModel()

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
        }
        .modelContainer(sharedModelContainer)
    }
}
