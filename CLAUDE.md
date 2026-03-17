# 光芒祭POSシステム - CLAUDE.md

## プロジェクト概要

信州大学の学園祭「光芒祭」（2026年11月開催）向けのPOSシステム。現金・PayPay・Tap to Pay on iPhoneの3種類の決済に対応。

## モノレポ構成

```
apps/
├── web/        - React PWA (管理画面・Web POS)
├── api/        - Node.js Express (バックエンドAPI)
└── ios-pos/    - SwiftUI (iOS POSアプリ)
packages/
└── shared/     - 共有TypeScript型・ユーティリティ
```

**パッケージマネージャ:** pnpm workspaces + Turborepo

## 技術スタック

### API (apps/api/)
- **Runtime:** Node.js 20.x LTS
- **Framework:** Express 4.x + TypeScript 5.x
- **ORM:** Prisma 7.x
- **DB:** PostgreSQL 15.x (本番) / SQLite (開発)
- **認証:** JWT
- **リアルタイム:** Socket.io 4.x
- **権限管理:** CASL (@casl/ability)

### Web (apps/web/)
- **UI:** React 18.x + TypeScript 5.x
- **ビルド:** Vite 6.x
- **状態管理:** TanStack Query 5.x (サーバー) + Zustand 4.x (クライアント)
- **スタイル:** Tailwind CSS 3.x + shadcn/ui
- **フォーム:** React Hook Form + Zod

### iOS (apps/ios-pos/)
- **言語:** Swift 5.10+ / SwiftUI
- **最低OS:** iOS 17.0+
- **ローカルDB:** SwiftData
- **決済:** Stripe Terminal iOS SDK ~5.x
- **アーキテクチャ:** MVVM

## APIエンドポイント (v1)

| パス | 用途 |
|------|------|
| `/auth` | 認証 (ログイン・リフレッシュ・ログアウト) |
| `/users` | ユーザー管理 |
| `/organizations` | 団体管理 |
| `/permissions` | 権限・ロール管理 |
| `/transactions` | POS取引 |
| `/products`, `/categories`, `/discounts` | 在庫管理 |
| `/admin` | システム管理 |
| `/audit-logs` | 監査ログ |
| `/stripe` | Tap to Pay統合 (Phase 3) |

## データベース主要モデル

- **User** - ユーザーアカウント
- **Organization** - 出店団体
- **UserOrganization** - 団体メンバーシップ
- **ServiceRole / Permission** - RBAC
- **Product / Category / Discount** - 在庫
- **Transaction / TransactionItem** - 売上
- **AuditLog** - 監査ログ
- **CashReport** - レジ精算

**決済方法:** CASH / PAYPAY / TAP_TO_PAY

## 開発フェーズ・スケジュール

| 時期 | フェーズ |
|------|---------|
| 現在 | Web POS完成・iOS Phase 1着手 |
| 2026年5月 | iOS Phase 2完了（現金・PayPay） |
| 2026年6月 | iOS Phase 3完了（Tap to Pay） |
| 2026年7月 | App Store申請 |
| 2026年11月 | 本番稼働 🎉 |

## 開発コマンド

```bash
pnpm dev          # 全アプリ起動 (HMR付き)
pnpm build        # 本番ビルド
pnpm lint         # Lint
pnpm test         # テスト
```

## 重要な開発資料

- `開発資料/API設計書.md` - API仕様
- `開発資料/DB設計書.md` - DB設計
- `開発資料/画面設計書.md` - UI設計
- `開発資料/iOSアプリ資料/iOSapp仕様書_v3.2.md` - iOS仕様書
- `開発資料/iOSアプリ資料/iOS実装計画.md` - iOS実装ロードマップ
- `開発資料/iOSアプリ資料/ttpoi資料/` - Tap to Pay参考資料
- `開発資料/権限管理システム導入計画.md` - RBAC設計
- `開発資料/監査ログ仕様書.md` - 監査ログ仕様
- `開発資料/割引および合計金額の計算仕様.md` - 割引計算
- `apps/api/prisma/schema.prisma` - Prismaスキーマ（正として扱う）

## セキュリティ方針

- JWT認証 (Keychain保存 on iOS)
- CASL による組織スコープの権限制御
- bcrypt パスワードハッシュ
- Helmet / CORS / rate-limit 設定済み
- Stripe秘密鍵はサーバーサイドのみ

## 注意点

- 組織（団体）ごとにデータがスコープされる。APIでは常に組織IDを考慮すること
- システム管理者は全組織にアクセス可能
- 監査ログは主要な操作すべてに必要
- PayPay決済は5秒ポーリング・180秒タイムアウト
- Tap to Pay の有効化は `enable_tap_to_pay` 権限が必要

## 実装前の計画作成と承認ルール

非自明な機能実装・設計変更・リファクタリング時は **必ず** 以下のプロセスに従うこと：

1. **実装計画の作成**
   - 実装内容を **日本語** で詳細に記載した計画書を作成
   - 以下の項目を含める：
     - 実装する機能・変更の概要
     - 影響するファイル・コンポーネント（相対パスで明記）
     - 既存コードとの統合方法
     - 使用するAPI エンドポイント・データモデル
     - テスト対象
     - 設計上の決定理由

2. **ユーザーへの承認申請**
   - 実装計画をユーザーに提示し、フィードバックを得る
   - 修正・承認を得てから実装開始
   - 方針の変更や問題が判明した場合は計画を更新して再申請

3. **実装開始**
   - ユーザーの承認を得た後に初めて実装を開始
   - 大きな方針変更が生じた場合は計画を更新し、必要に応じて再承認を得る

## iOS 開発ルール

### Apple Human Interface Guidelines (HIG) 厳守

iOSアプリのUI生成・修正時は **必ず** Apple HIG に従うこと。主要な原則：

- **ナビゲーション:** `NavigationStack` / `NavigationSplitView` を使用し、階層は浅く保つ。戻るボタンは削除しない
- **コントロール:** 用途に合った標準コンポーネントを使う（`Button`, `Toggle`, `Picker`, `Stepper` など）。カスタムコンポーネントは標準で対応できない場合のみ
- **タイポグラフィ:** `Font.title`, `Font.body`, `Font.caption` 等のダイナミックタイプを使用。固定pt指定は避ける
- **スペーシング:** 8pt グリッドに準拠。余白は `padding()` のデフォルト値（16pt）を基準にする
- **カラー:** システムカラー（`Color.primary`, `Color.secondary`, `Color.accentColor`）を基本とし、テーマカラーは `Color+Theme.swift` の定義を使う。ダークモード対応を必須とする
- **アイコン:** SF Symbols を優先使用する（`Image(systemName:)`）
- **フィードバック:** 操作結果は視覚・触覚フィードバック（`sensoryFeedback`）で明示する
- **アクセシビリティ:** `accessibilityLabel`, `accessibilityHint` を意味のある要素に付与する。VoiceOver対応必須
- **モーダル:** Sheet / Alert / ConfirmationDialog は用途を正しく使い分ける。Alert は破壊的操作の確認のみに限定
- **最小タップ領域:** インタラクティブ要素は 44×44pt 以上を確保する
- **Liquid Glass:** iOS 26以降では標準UIコンポーネント（タブバー・ボタン・スライダー等）を使うことで自動適用される。カスタムUIを作る場合は以下のルールに従うこと

#### Liquid Glass ルール（iOS 26+）

- **使用場面:** システム標準コンポーネント（`TabView`, `NavigationBar`, `Button` スタイルなど）を優先し、SwiftUIの標準実装で自動適用を受ける。独自の半透明UIを作る場合のみ `glassEffect()` モディファイアを使う
- **3原則に沿った設計:**
  - *Hierarchy（階層）* — コントロールはコンテンツを引き立てる役割。過度な装飾でコンテンツを埋もれさせない
  - *Harmony（調和）* — ガラスエフェクトはデバイス全体のデザインと自然に統合する。無闇に多用しない
  - *Consistency（一貫性）* — システムの慣習を尊重し、ライト/ダークモード両方で見た目が破綻しないことを確認する
- **アクセシビリティ:** 背景が複雑な場合、半透明UIはテキストの読みやすさを損なう。コントラスト比 **4.5:1 以上**（WCAG AA）を必ず確保する
- **後方互換:** iOS 17〜25 では Liquid Glass エフェクトは適用されない。`if #available(iOS 26, *)` で分岐するか、標準コンポーネントに任せて自動フォールバックを活用する

**HIG参照ルール:** iOSのUI実装時、該当コンポーネントや操作パターンに関するHIGのガイドラインが不明確な場合は `WebFetch` で以下のURLを参照してから実装すること。

| トピック | URL |
|---------|-----|
| トップページ | https://developer.apple.com/design/human-interface-guidelines/ |
| ボタン | https://developer.apple.com/design/human-interface-guidelines/buttons |
| ナビゲーション | https://developer.apple.com/design/human-interface-guidelines/navigation-bars |
| タブバー | https://developer.apple.com/design/human-interface-guidelines/tab-bars |
| モーダル | https://developer.apple.com/design/human-interface-guidelines/sheets |
| アラート | https://developer.apple.com/design/human-interface-guidelines/alerts |
| フォーム | https://developer.apple.com/design/human-interface-guidelines/text-fields |
| リスト | https://developer.apple.com/design/human-interface-guidelines/lists-and-tables |
| SF Symbols | https://developer.apple.com/design/human-interface-guidelines/sf-symbols |
| アクセシビリティ | https://developer.apple.com/design/human-interface-guidelines/accessibility |
| カラー | https://developer.apple.com/design/human-interface-guidelines/color |
| タイポグラフィ | https://developer.apple.com/design/human-interface-guidelines/typography |
| Liquid Glass | https://developer.apple.com/design/human-interface-guidelines/liquid-glass |

### Xcode プロジェクト管理

- プロジェクトは **`PBXFileSystemSynchronizedRootGroup`** (Xcode 16+) を使用している。`pos/` ディレクトリに置いた `.swift` ファイルは **自動的にビルド対象に含まれる**。xcodeproj gem でファイルを手動追加する必要はない。
- 新しいサブディレクトリを作成した場合も同様に自動同期される。

### ビルド確認コマンド

```bash
# iOS Simulator (iPhone 16 / iOS 18.3.1) でビルド確認
xcodebuild build \
  -project apps/ios-pos/pos/pos.xcodeproj \
  -scheme pos \
  -destination 'platform=iOS Simulator,id=3B7D7E21-C1C4-4BFD-A06C-71B83BF1710C' \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  2>&1 | grep -E "error:|BUILD (SUCCEEDED|FAILED)"
```

### iOS SwiftUI カラー使用ルール

- `Color+Theme.swift` に `appPrimary`, `appSuccess`, `appWarning`, `appError` を定義済み
- **`.foregroundStyle()` の引数では必ず `Color.appXxx` と明示する**（`.appXxx` のショートハンドは `ShapeStyle` 推論が失敗するため）
- `.tint()` / `.background()` は `Color` 引数を直接取るので `.appXxx` ショートハンドでも可

```swift
// ✅ 正しい
.foregroundStyle(Color.appError)
.tint(.appPrimary)

// ❌ コンパイルエラー
.foregroundStyle(.appError)
```

### API レスポンス形式

バックエンド API はすべて `{ success: Bool, data: T }` 形式でレスポンスをラップしている。`APIClient` の `APIEnvelope<T>` が自動的に `data` を取り出すため、サービス層は `T` を直接デコードするだけでよい。

### Swift Concurrency（Actor Isolation）ルール

#### ビルド設定
- **`SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` は設定しない。** これを有効にすると、`actor`・`nonisolated` な型との間でアイソレーション競合が全面的に発生し、`nonisolated(unsafe)` や `Task.detached` の多用を強いられる。
- Swift Concurrency のアイソレーションは **型ごとに明示的に付与する** のが原則。

#### ViewModel（UI 状態を持つクラス）
- `@Observable` クラスには **クラスレベルで `@MainActor` を付与する**。
- 各メソッドに個別に `@MainActor` を付けると冗長になる上、将来的な移動時に漏れが生じるため避ける。

```swift
// ✅ 正しい
@MainActor
@Observable
final class AuthViewModel { ... }

// ❌ 冗長・保守しにくい
@Observable
final class AuthViewModel {
    @MainActor func login(...) async { ... }
    @MainActor func logout() { ... }
}
```

#### actor（非同期 I/O クライアント）
- `actor APIClient` のような非同期 I/O クラスは `actor` として定義し、内部の並行性は Swift ランタイムに任せる。
- `static let shared` は `nonisolated` にしてインスタンス取得をどこからでも可能にする（ただし `nonisolated(unsafe)` は不要）。
- 内部の `Task { }` は actor-isolated コンテキストで十分なため、`Task.detached` は使わない。

```swift
// ✅ 正しい
actor APIClient {
    nonisolated static let shared = APIClient()
    func request<T: Decodable>(...) async throws -> T { ... }
}

// ❌ 不要な nonisolated(unsafe) / Task.detached
actor APIClient {
    nonisolated(unsafe) static let shared = APIClient()
    nonisolated func request<T>(...) async throws -> T {
        return try await Task.detached { ... }.value
    }
}
```

#### 値型・ヘルパー型
- `Constants`・`APITypes` 等の純粋な値型は通常の `struct` で定義する。
- `Sendable` 制約は必要な場合のみ付与する（値型の `struct` は原則 `Sendable` 準拠済み）。
- `nonisolated(unsafe)` は真に不可避な場合のみ使用し、不要なら削除する。

#### `KeychainHelper`（`@unchecked Sendable`）
- スレッドセーフな同期 API をラップしているため `@unchecked Sendable` で宣言する。
- `nonisolated` や `nonisolated(unsafe)` は不要（ KeychainAccess ライブラリが内部でスレッドを安全に扱う）。
