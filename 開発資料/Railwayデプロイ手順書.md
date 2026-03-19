# Railway デプロイ手順書

## 概要

光芒祭POSシステムをRailwayにデプロイする手順をまとめる。
既存のDockerfile・nginx.conf・docker-compose.prod.ymlは**一切変更しない**。
Railway UIの設定だけでデプロイを完結させる。

## 前提

- GitHubリポジトリがRailwayと連携済みであること
- Railway CLIまたはWebダッシュボードを使用

## 構成図

```
ブラウザ
  ├── https://<web>.railway.app    → Web (静的ファイル / Nginx)
  └── https://<api>.railway.app    → API (Node.js Express)

iOS App
  └── https://<api>.railway.app    → API

API  →  PostgreSQL (Railway プラグイン)
```

- RailwayはサービスごとにHTTPS URLを自動発行する
- Web ↔ API 間はブラウザからの直接通信（Nginxプロキシは不使用）

## 手順

### 1. Railwayプロジェクト作成

1. [Railway Dashboard](https://railway.app/dashboard) にログイン
2. **「New Project」→「Deploy from GitHub repo」** を選択
3. 対象リポジトリを選択

### 2. PostgreSQLの追加

1. プロジェクト画面で **「+ New」→「Database」→「Add PostgreSQL」**
2. 自動的に `DATABASE_URL` 等の環境変数が生成される
3. 生成された `DATABASE_URL` をメモしておく（API サービスで使用）

### 3. APIサービスの作成

1. **「+ New」→「GitHub Repo」** で同じリポジトリを選択
2. **Settings** タブで以下を設定：

| 設定項目 | 値 |
|---------|-----|
| **Builder** | Dockerfile |
| **Dockerfile Path** | `Dockerfile.api` |
| **Watch Paths** | `apps/api/**`, `packages/shared/**` |

3. **Variables** タブで環境変数を設定：

| 変数名 | 値 | 備考 |
|--------|-----|------|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | PostgreSQLプラグインを参照 |
| `JWT_SECRET` | （安全なランダム文字列） | `openssl rand -hex 32` で生成 |
| `CORS_ORIGIN` | `https://<web>.railway.app` | Webサービスのデプロイ後に設定 |
| `PORT` | `3001` | |
| `PAYPAY_API_KEY` | （PayPayキー） | 必要に応じて |
| `PAYPAY_API_SECRET` | （PayPayシークレット） | 必要に応じて |
| `PAYPAY_MERCHANT_ID` | （マーチャントID） | 必要に応じて |
| `STRIPE_SECRET_KEY` | （Stripeキー） | Tap to Pay用 |
| `STRIPE_LOCATION_ID` | （StripeロケーションID） | Tap to Pay用 |

4. **Settings → Networking** で **「Generate Domain」** をクリックし、公開URLを取得

### 4. Webサービスの作成

1. **「+ New」→「GitHub Repo」** で同じリポジトリを再度選択
2. **Settings** タブで以下を設定：

| 設定項目 | 値 |
|---------|-----|
| **Builder** | Dockerfile |
| **Dockerfile Path** | `Dockerfile.web` |
| **Watch Paths** | `apps/web/**`, `packages/shared/**`, `nginx.conf` |

3. **Variables** タブで**ビルド引数**を設定：

| 変数名 | 値 | 備考 |
|--------|-----|------|
| `VITE_API_URL` | `https://<api>.railway.app/api/v1` | APIサービスの公開URL |
| `VITE_SOCKET_URL` | `https://<api>.railway.app` | Socket.io接続先 |

> **注意:** `VITE_` プレフィックスの変数はViteのビルド時に埋め込まれる。
> Railwayでは Variables に設定するとビルド引数(`ARG`)としても使われるため、
> `Dockerfile.web` の `ARG VITE_API_URL` のデフォルト値が上書きされる。

4. **Settings → Networking** で **「Generate Domain」** をクリック

### 5. CORSの設定（APIサービス）

Webサービスのデプロイ後、公開URLが確定したら：

1. APIサービスの **Variables** に戻る
2. `CORS_ORIGIN` をWebの公開URL（例: `https://web-xxx.railway.app`）に設定
3. APIサービスが自動で再デプロイされる

> **CORS設定の仕組み:**
> `apps/api/src/server.ts` で `cors({ origin: process.env.CORS_ORIGIN })` としているため、
> 環境変数でWebのURLを指定するだけで制御できる。

### 6. データベースのマイグレーション・シード

APIサービスのデプロイ後、Railway のシェルまたはCLIで実行：

```bash
# Railway CLIの場合
railway shell -s api

# マイグレーション実行
npx prisma migrate deploy

# シードデータ投入（初回のみ）
npx prisma db seed
```

または、Railway ダッシュボードでAPIサービスの **「Shell」** タブから直接実行する。

### 7. 動作確認

1. `https://<web>.railway.app` にアクセスし、ログイン画面が表示されること
2. シードデータのアカウントでログインできること
3. APIへのリクエスト（商品一覧取得等）が正常に動作すること
4. Socket.io（リアルタイム通知）が接続されること

## Nginxプロキシについて

既存の `nginx.conf` にはAPIへのプロキシ設定（`/api/` → `http://api:3001`）が含まれるが、
Railway上では `api` というホスト名が解決できないため、このプロキシは機能しない。
ただし **静的ファイル配信やSPAルーティングには影響しない** ため、削除する必要はない。

EC2 + Docker Compose 環境ではプロキシが有効に動作するので、
`nginx.conf` は現状のまま両環境で共用できる。

## 既存環境（EC2/Docker Compose）との共存

| ファイル | EC2環境 | Railway |
|---------|---------|---------|
| `docker-compose.prod.yml` | 使用する | 使用しない |
| `nginx.conf` | APIプロキシが動作 | プロキシは無視される（静的配信のみ有効） |
| `Dockerfile.api` | そのまま使用 | そのまま使用 |
| `Dockerfile.web` | `VITE_API_URL="/api/v1"`（デフォルト） | ビルド引数で絶対URLに上書き |

**既存ファイルへの変更は一切不要。**

## カスタムドメイン（任意）

独自ドメインを設定すると `https://pos.example.com` のようなわかりやすいURLでアクセスできる。
SSL証明書はRailwayが自動発行・自動更新するため、手動管理は不要。

### ドメインの取得

ドメインを未取得の場合、以下のサービスで取得できる（年額 ~1,000〜2,000円程度）。

| サービス | 特徴 |
|---------|------|
| [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | 原価提供で最安、DNS管理も優秀 |
| [Google Domains → Squarespace](https://domains.squarespace.com/) | シンプルなUI |
| [お名前.com](https://www.onamae.com/) | 日本語対応、`.jp` ドメインに強い |
| [Namecheap](https://www.namecheap.com/) | 海外では定番 |

### サブドメイン設計例

Web用とAPI用で別々のサブドメインを割り当てる。

```
pos.koubou-fes.example.com       → Webサービス（管理画面・Web POS）
api.koubou-fes.example.com       → APIサービス（バックエンド）
```

または、ルートドメインを使う場合：

```
koubou-pos.example.com           → Webサービス
api.koubou-pos.example.com       → APIサービス
```

### 設定手順

#### ステップ1: Railwayでカスタムドメインを登録

**Webサービス：**

1. Railway ダッシュボードでWebサービスを選択
2. **Settings → Networking → Custom Domain** セクションへ移動
3. **「+ Custom Domain」** をクリック
4. ドメインを入力（例: `pos.koubou-fes.example.com`）
5. Railwayが必要なDNSレコード情報を表示するのでメモする

**APIサービス：**

1. 同様にAPIサービスの Settings → Networking へ移動
2. APIのドメインを入力（例: `api.koubou-fes.example.com`）
3. 表示されるDNSレコード情報をメモする

#### ステップ2: DNSレコードの設定

ドメインを取得したレジストラ（またはCloudflare等のDNS管理サービス）で、
Railwayが指示するDNSレコードを追加する。

**サブドメインの場合（CNAME）：**

| タイプ | ホスト名 | 値 | TTL |
|--------|---------|-----|-----|
| CNAME | `pos` | `<railway-provided-value>.railway.app` | 3600（自動） |
| CNAME | `api` | `<railway-provided-value>.railway.app` | 3600（自動） |

> `<railway-provided-value>` はRailwayのカスタムドメイン設定画面に表示される値を使う。

**ルートドメイン（Apex）の場合：**

ルートドメイン（例: `koubou-pos.example.com` ではなく `example.com`）を使う場合、
CNAMEは設定できないため、以下のいずれかを使う：

- **Cloudflare:** CNAME Flattening により、ルートドメインでもCNAMEが使える（推奨）
- **その他:** Railwayが表示するAレコード（IPアドレス）を設定する

#### ステップ3: DNS伝播の確認

DNSレコードを設定後、伝播に数分〜最大48時間かかる場合がある（通常は数分）。

確認方法：

```bash
# CNAMEレコードが設定されたか確認
dig pos.koubou-fes.example.com CNAME +short

# Aレコードに解決されるか確認
dig pos.koubou-fes.example.com A +short

# curlで接続テスト
curl -I https://pos.koubou-fes.example.com
```

Railwayのダッシュボード上でも、カスタムドメインの横にチェックマーク ✓ が表示されれば
DNS検証が完了している。

#### ステップ4: SSL証明書の自動発行

DNS検証が完了すると、Railwayが自動でLet's EncryptのSSL証明書を発行する。
手動での操作は不要。証明書の自動更新もRailwayが行う。

発行には数分かかることがある。完了するまでHTTPSアクセスで証明書エラーが出る場合がある。

#### ステップ5: 環境変数の更新

カスタムドメインに切り替えた後、関連する環境変数を更新する。

**APIサービス：**

| 変数名 | 変更前 | 変更後 |
|--------|--------|--------|
| `CORS_ORIGIN` | `https://web-xxx.railway.app` | `https://pos.koubou-fes.example.com` |

**Webサービス（ビルド引数）：**

| 変数名 | 変更前 | 変更後 |
|--------|--------|--------|
| `VITE_API_URL` | `https://api-xxx.railway.app/api/v1` | `https://api.koubou-fes.example.com/api/v1` |
| `VITE_SOCKET_URL` | `https://api-xxx.railway.app` | `https://api.koubou-fes.example.com` |

> **注意:** `VITE_` 変数はビルド時に埋め込まれるため、変数変更後にWebサービスの
> **再デプロイ（Redeploy）が必要**。

**iOSアプリ：**

iOSアプリのAPIベースURLも新しいドメインに変更する。

#### ステップ6: 動作確認

1. `https://pos.koubou-fes.example.com` にアクセスし、画面が正常に表示されること
2. ログイン・API通信が正常に動作すること
3. ブラウザのアドレスバーに鍵マーク（HTTPS）が表示されていること
4. Socket.io のリアルタイム通知が動作すること

### Cloudflareをプロキシとして使う場合の注意

Cloudflareのプロキシ（オレンジ雲アイコン）を有効にする場合：

- **WebSocket対応:** Cloudflareダッシュボードの **Network → WebSockets** をONにする
- **SSL/TLS モード:** **「Full (strict)」** に設定する（RailwayがSSL証明書を持っているため）
- **キャッシュ:** APIリクエスト（`/api/*`）がキャッシュされないよう、Page Ruleで除外する

Cloudflareを使わない場合は、DNSレコードのプロキシを **オフ（灰色雲）** にして
Railwayに直接接続させる。

## トラブルシューティング

### ビルドが失敗する
- **Dockerfile Path** が正しく設定されているか確認
- Railway のビルドログで具体的なエラーを確認

### APIに接続できない
- `CORS_ORIGIN` がWebの公開URLと一致しているか確認（末尾スラッシュに注意）
- APIサービスのドメインが生成・公開されているか確認

### DBに接続できない
- `DATABASE_URL` がPostgreSQLプラグインの参照変数（`${{Postgres.DATABASE_URL}}`）になっているか確認
- マイグレーションが実行済みか確認

### Socket.ioが繋がらない
- `VITE_SOCKET_URL` がAPIの公開URLと一致しているか確認
- APIサービスでWebSocket接続が許可されているか確認（Railwayはデフォルトで対応）

## コスト目安

| プラン | 料金 | 備考 |
|-------|------|------|
| Hobby | $5/月 + 従量課金 | 個人開発向け。メモリ8GB/vCPU 8まで |
| Trial | 無料（$5分/月） | クレジットカード不要、制限あり |

学園祭当日（2026年11月）のアクセス集中時は従量課金が増える可能性がある。
事前にRailwayのUsageページで使用状況をモニタリングすること。
