//
//  posApp.swift
//  pos
//
//  Created by Soya on 2026/03/15.
//

import SwiftUI
import SwiftData

@main
struct posApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            CachedCategory.self,
            CachedProduct.self,
            CachedDiscount.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}

