import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var logText: String = "SwiftData Test Logs:\n"
    
    var body: some View {
        VStack(spacing: 20) {
            Text("SwiftData Tester")
                .font(.title)
                .padding(.top)
            
            ScrollView {
                Text(logText)
                    .font(.system(.caption, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
            }
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
            .padding()
            
            HStack {
                Button("Save Mock Data") {
                    Task { await testSave() }
                }
                .buttonStyle(.bordered)
                
                Button("Load Data") {
                    Task { await testLoad() }
                }
                .buttonStyle(.bordered)
            }
            
            Button("Clear Cache") {
                Task { await testClear() }
            }
            .foregroundColor(.red)
            .padding(.bottom)
        }
    }
    
    private func appendLog(_ text: String) {
        DispatchQueue.main.async {
            logText += "[\(Date().formatted(date: .omitted, time: .standard))] \(text)\n"
        }
    }
    
    // Test logic wrapped in actor instance
    private func getCacheService() -> CacheService {
        return CacheService(modelContainer: modelContext.container)
    }
    
    private func testSave() async {
        appendLog("--- Saving Mock Data ---")
        let service = getCacheService()
        do {
            let cat1 = CachedCategory(id: "c1", organizationId: "org-1", name: "Foods")
            let cat2 = CachedCategory(id: "c2", organizationId: "org-1", name: "Drinks")
            try await service.saveCategories([cat1, cat2])
            
            let p1 = CachedProduct(id: "p1", organizationId: "org-1", categoryId: "c1", name: "Takoyaki", price: 500)
            let p2 = CachedProduct(id: "p2", organizationId: "org-1", categoryId: "c2", name: "Cola", price: 150)
            p1.category = cat1
            p2.category = cat2
            try await service.saveProducts([p1, p2])
            
            appendLog("✅ Successfully saved 2 categories and 2 products")
        } catch {
            appendLog("❌ Save failed: \(error)")
        }
    }
    
    private func testLoad() async {
        appendLog("--- Loading Mock Data ---")
        let service = getCacheService()
        do {
            let products = try await service.fetchProducts(for: "org-1")
            appendLog("✅ Loaded \(products.count) products:")
            for p in products {
                appendLog("  - \(p.name) (¥\(p.price)) [Cat: \(p.category?.name ?? "None")]")
            }
            
            let categories = try await service.fetchCategories(for: "org-1")
            appendLog("✅ Loaded \(categories.count) categories")
        } catch {
            appendLog("❌ Load failed: \(error)")
        }
    }
    
    private func testClear() async {
        appendLog("--- Clearing Cache ---")
        let service = getCacheService()
        do {
            try await service.deleteProducts()
            try await service.deleteCategories()
            try await service.deleteDiscounts()
            appendLog("✅ Cache cleared")
        } catch {
            appendLog("❌ Clear failed: \(error)")
        }
    }
}

#Preview {
    ContentView()
}
