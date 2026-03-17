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
