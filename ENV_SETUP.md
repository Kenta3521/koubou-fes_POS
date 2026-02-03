# 光芒祭POSシステム - 環境変数セットアップガイド

## 概要

このプロジェクトでは、フロントエンド（apps/web）とバックエンド（apps/api）で環境変数を使用します。

---

## セットアップ手順

### 1. バックエンド環境変数（apps/api）

```bash
cd apps/api
cp .env.example .env
```

`.env`ファイルを編集し、必要な値を設定してください：

```bash
# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Database (Phase1 P1-007で設定)
DATABASE_URL=postgresql://user:pass@localhost:5432/koubou_pos

# JWT (Phase1 P1-011で設定)
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d

# PayPay (Phase3で設定)
# PAYPAY_API_KEY=
# PAYPAY_API_SECRET=
# PAYPAY_MERCHANT_ID=
# PAYPAY_PRODUCTION=false
```

### 2. フロントエンド環境変数（apps/web）

```bash
cd apps/web
cp .env.example .env
```

`.env`ファイルを編集し、必要な値を設定してください：

```bash
VITE_API_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=http://localhost:3001
```

---

## 環境変数一覧

### バックエンド（apps/api）

| 変数名 | 説明 | デフォルト値 | Phase |
|--------|------|-------------|-------|
| `PORT` | APIサーバーのポート | `3001` | Phase1 |
| `NODE_ENV` | 実行環境 | `development` | Phase1 |
| `CORS_ORIGIN` | 許可するオリジン | `http://localhost:5173` | Phase1 |
| `LOG_LEVEL` | ログレベル | `info` | Phase1 |
| `DATABASE_URL` | PostgreSQL接続文字列 | - | Phase1 (P1-007) |
| `JWT_SECRET` | JWT署名キー | - | Phase1 (P1-011) |
| `JWT_EXPIRES_IN` | JWTの有効期限 | `7d` | Phase1 (P1-011) |
| `PAYPAY_API_KEY` | PayPay APIキー | - | Phase3 |
| `PAYPAY_API_SECRET` | PayPay APIシークレット | - | Phase3 |
| `PAYPAY_MERCHANT_ID` | PayPay加盟店ID | - | Phase3 |
| `PAYPAY_PRODUCTION` | PayPay本番環境フラグ | `false` | Phase3 |

### フロントエンド（apps/web）

| 変数名 | 説明 | デフォルト値 | Phase |
|--------|------|-------------|-------|
| `VITE_API_URL` | APIのベースURL | `http://localhost:3001/api/v1` | Phase1 |
| `VITE_SOCKET_URL` | Socket.ioのURL | `http://localhost:3001` | Phase1 |

---

## 注意事項

### セキュリティ

- **`.env`ファイルは絶対にGitにコミットしないでください**（`.gitignore`で除外済み）
- 本番環境では必ず強力な`JWT_SECRET`を設定してください
- 本番環境のデータベース認証情報は安全に管理してください

### 開発環境

- ローカル開発では`.env.example`の値をそのまま使用できます
- データベースはDocker Composeで起動します（Phase1 P1-010）

### 本番環境

- Railway/Vercelの環境変数設定UIで設定してください
- `NODE_ENV=production`に設定してください
- `CORS_ORIGIN`を本番フロントエンドのURLに設定してください

---

## トラブルシューティング

### 環境変数が読み込まれない

- `.env`ファイルが正しいディレクトリにあるか確認
- サーバーを再起動してください
- Viteの場合、`VITE_`プレフィックスが必要です

### CORS エラー

- `CORS_ORIGIN`がフロントエンドのURLと一致しているか確認
- 両方のサーバーが起動しているか確認
