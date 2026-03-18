import SwiftUI

/// TTP 教育画面 (iOS-3-023)
///
/// 3ページスワイプで Tap to Pay の使い方を説明する。
/// - オンボーディングフロー内: 完了後 TTPTryItOutView へ遷移
/// - 設定画面から単独表示: 完了で dismiss()
struct TTPEducationView: View {
    /// true = 設定画面からの単独表示（「閉じる」で dismiss）
    let isStandalone: Bool
    /// オンボーディングフロー完了時のコールバック（isStandalone == false 時に使用）
    var onComplete: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var currentPage = 0
    @State private var showTryItOut = false

    private let pages = EducationPage.allPages

    var body: some View {
        VStack(spacing: 0) {
            // ページインジケーター
            pageIndicator
                .padding(.top, 16)

            // ページコンテンツ
            TabView(selection: $currentPage) {
                ForEach(Array(pages.enumerated()), id: \.offset) { index, page in
                    educationPageView(page)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // ボタン
            Button {
                advancePage()
            } label: {
                Text(currentPage < pages.count - 1 ? "次へ" : (isStandalone ? "閉じる" : "完了する"))
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(.appPrimary)
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .navigationTitle("タッチ決済の使い方")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isStandalone {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("閉じる") { dismiss() }
                }
            }
        }
        .navigationDestination(isPresented: $showTryItOut) {
            TTPTryItOutView {
                onComplete?()
            }
        }
    }

    // MARK: - Subviews

    private var pageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(0..<pages.count, id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? Color.appPrimary : Color.secondary.opacity(0.3))
                    .frame(width: 8, height: 8)
            }
        }
    }

    private func educationPageView(_ page: EducationPage) -> some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: page.symbolName)
                .font(.system(size: 72))
                .foregroundStyle(Color.appPrimary)
                .accessibilityHidden(true)

            Text(page.title)
                .font(.title2.bold())
                .multilineTextAlignment(.center)

            Text(page.description)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            if !page.badges.isEmpty {
                HStack(spacing: 12) {
                    ForEach(page.badges, id: \.self) { badge in
                        Text(badge)
                            .font(.caption2.weight(.medium))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.quaternary, in: Capsule())
                    }
                }
            }

            Spacer()
        }
    }

    // MARK: - Actions

    private func advancePage() {
        if currentPage < pages.count - 1 {
            withAnimation { currentPage += 1 }
        } else if isStandalone {
            dismiss()
        } else {
            showTryItOut = true
        }
    }
}

// MARK: - Education Page Model

private struct EducationPage {
    let symbolName: String
    let title: String
    let description: String
    let badges: [String]

    static let allPages: [EducationPage] = [
        EducationPage(
            symbolName: "creditcard",
            title: "カードをかざして決済",
            description: "お客様のクレジットカードをiPhoneの上部にかざしてもらいます。",
            badges: ["Visa", "Mastercard", "American Express"]
        ),
        EducationPage(
            symbolName: "apple.logo",
            title: "デジタルウォレットにも対応",
            description: "Apple Pay・Google Pay などのデジタルウォレットでも決済できます。",
            badges: ["Apple Pay", "Google Pay"]
        ),
        EducationPage(
            symbolName: "checkmark.circle",
            title: "結果がすぐに表示",
            description: "承認・拒否の結果がすぐに画面に表示されます。お客様にも確認してもらえます。",
            badges: []
        ),
    ]
}

#Preview("Standalone") {
    NavigationStack {
        TTPEducationView(isStandalone: true)
    }
}

#Preview("Onboarding Flow") {
    NavigationStack {
        TTPEducationView(isStandalone: false) {
            print("Complete")
        }
    }
}
