import SwiftUI

/// TTP ソフトウェア更新プログレス (iOS-3-026)
///
/// `TapToPayService.setupProgress` を監視し、進捗を表示する。
struct TTPSetupProgressView: View {
    private let service = TapToPayService.shared

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .opacity(0.95)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                ProgressView(value: Double(service.setupProgress), total: 1.0)
                    .progressViewStyle(.linear)
                    .tint(.appPrimary)
                    .frame(width: 220)

                Text("タッチ決済を準備中...")
                    .font(.headline)

                Text("\(Int(service.setupProgress * 100))%")
                    .font(.title2.monospacedDigit().bold())
                    .foregroundStyle(Color.appPrimary)

                Text("しばらくお待ちください")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(32)
        }
        .accessibilityLabel("タッチ決済のソフトウェアを更新中。\(Int(service.setupProgress * 100))パーセント完了")
    }
}

#Preview {
    TTPSetupProgressView()
}
