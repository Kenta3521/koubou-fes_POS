# 光芒祭POSシステム

信州大学工学部の学園祭「光芒祭」で使用するPOSシステムです。

## 技術スタック

- **Monorepo**: pnpm workspace + Turborepo
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL
- **Payment**: PayPay API

## プロジェクト構造

```
koubou-fes-pos/
├── apps/
│   ├── web/          # フロントエンド (React)
│   └── api/          # バックエンド (Express)
├── packages/
│   └── shared/       # 共通型定義
└── 開発資料/          # 設計ドキュメント
```

## セットアップ

### 前提条件

- Node.js 20.x以上
- pnpm 8.x以上
- Docker (PostgreSQL用)

### インストール

```bash
# 依存関係のインストール
pnpm install

# 開発用データベースの起動
docker-compose up -d

# 開発サーバーの起動
pnpm dev
```

### 環境変数

`.env.example`をコピーして`.env`を作成し、必要な環境変数を設定してください。

## 開発

```bash
# 開発サーバー起動（全アプリ）
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# テスト
pnpm test
```

## ドキュメント

開発に関する詳細は `開発資料/` ディレクトリを参照してください。

- [開発原則.md](./開発資料/開発原則.md) - 開発ルール
- [開発フェーズ計画.md](./開発資料/開発フェーズ計画.md) - フェーズ概要
- [技術スタック.md](./開発資料/技術スタック.md) - 技術選定
- [DB設計書.md](./開発資料/DB設計書.md) - データベース設計
- [API設計書.md](./開発資料/API設計書.md) - API仕様
- [画面設計書.md](./開発資料/画面設計書.md) - 画面仕様

## ライセンス

このプロジェクトは信州大学工学部の学園祭実行委員会によって管理されています。
