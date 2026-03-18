import SwiftUI

/// TTP 準備完了画面 (iOS-3-024)
///
/// 教育フロー完了後に表示。「レジ画面へ進む」で onComplete を呼びモーダルを閉じる。
struct TTPTryItOutView: View {
    var onComplete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // チェックマークアイコン
            ZStack {
                Circle()
                    .fill(Color.appSuccess.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.appSuccess)
            }
            .accessibilityHidden(true)
            .padding(.bottom, 24)

            Text("準備完了!")
                .font(.title.bold())
                .padding(.bottom, 8)

            Text("タッチ決済の設定が完了しました。\nレジ画面から決済を開始できます。")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer()

            Button {
                onComplete()
            } label: {
                Text("レジ画面へ進む")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(.appPrimary)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .navigationTitle("セットアップ完了")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
    }
}

#Preview {
    NavigationStack {
        TTPTryItOutView {
            print("Complete")
        }
    }
}
