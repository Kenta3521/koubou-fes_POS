# 光芒祭POSシステム - API設計書

**作成日:** 2026年2月3日  
**版数:** 1.0

---

## 1. 概要

### 1.1 基本仕様

| 項目 | 値 |
|------|-----|
| プロトコル | HTTPS |
| ベースURL | `/api/v1` |
| 認証方式 | JWT (Bearer Token) |
| フォーマット | JSON |
| 文字コード | UTF-8 |

### 1.2 共通レスポンス形式

**成功時:**
```json
{
  "success": true,
  "data": { ... }
}
```

**エラー時:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 1.3 HTTPステータスコード

| コード | 意味 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | 権限なし |
| 404 | リソースなし |
| 500 | サーバーエラー |

---

## 2. 認証 API

### 2.1 ログイン
```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "田中太郎",
      "isSystemAdmin": false,
      "organizations": [
        {
          "id": "org-uuid",
          "name": "電子情報工学科2年",
          "role": "ADMIN" // ADMIN, STAFF, PENDING
        }
      ]
    }
  }
}
```

### 2.2 新規登録
```
POST /api/v1/auth/register
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "山田花子",
  "inviteCode": "ABC123"
}
```

### 2.3 パスワードリセット要求
```
POST /api/v1/auth/password-reset/request
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

### 2.4 パスワードリセット実行
```
POST /api/v1/auth/password-reset/confirm
```

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```

### 2.5 トークンリフレッシュ
```
POST /api/v1/auth/refresh
```

### 2.6 ログアウト
```
POST /api/v1/auth/logout
```

---

## 3. ユーザー API

### 3.1 自分の情報取得
```
GET /api/v1/users/me
```

### 3.2 プロフィール更新
```
PATCH /api/v1/users/me
```

**Request:**
```json
{
  "name": "新しい名前"
}
```

### 3.3 パスワード変更
```
PATCH /api/v1/users/me/password
```

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### 3.4 団体追加（招待コード）
```
POST /api/v1/users/me/organizations
```

**Request:**
```json
{
  "inviteCode": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org-uuid",
    "name": "新しい団体名",
    "role": "PENDING" // 加入直後は承認待ち状態
  }
}
```
### 3.5 団体からの脱退
```
DELETE /api/v1/users/me/organizations/:organizationId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "脱退しました",
    "organizationId": "org-uuid"
  }
}
```

**Errors:**
- `ORG_NOT_FOUND`: 所属していない、または存在しない。
- `CANNOT_LEAVE_AS_LAST_ADMIN`: 唯一の管理者のため脱退不可。

---

---


## 4. 団体 API

### 4.1 所属団体一覧
```
GET /api/v1/organizations
```

### 4.2 団体詳細
```
GET /api/v1/organizations/:orgId
```

### 4.3 団体作成 (SYSTEM_ADMIN)
```
POST /api/v1/organizations
```

**Request:**
```json
{
  "name": "建築学科3年"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org-uuid",
    "name": "建築学科3年",
    "inviteCode": "XYZ789",
    "isActive": true
  }
}
```

### 4.4 団体更新 (SYSTEM_ADMIN)
```
PATCH /api/v1/organizations/:orgId
```

### 4.5 招待コード再発行 (SYSTEM_ADMIN)
```
POST /api/v1/organizations/:orgId/regenerate-invite
```

### 4.6 団体メンバー一覧
```
GET /api/v1/organizations/:orgId/members
```

### 4.7 メンバー権限変更 (ORG_ADMIN / SYSTEM_ADMIN)
```
PATCH /api/v1/organizations/:orgId/members/:userId
```

**Request:**
```json
{
  "role": "STAFF" // PENDINGからの変更（承認）、またはSTAFF/ADMIN間の変更
}
```

### 4.8 メンバー削除 (ORG_ADMIN)
```
DELETE /api/v1/organizations/:orgId/members/:userId
```

---

## 5. カテゴリ API

### 5.1 カテゴリ一覧
```
GET /api/v1/organizations/:orgId/categories
```

### 5.2 カテゴリ作成 (ORG_ADMIN)
```
POST /api/v1/organizations/:orgId/categories
```

**Request:**
```json
{
  "name": "フード",
  "sortOrder": 1
}
```

### 5.3 カテゴリ更新 (ORG_ADMIN)
```
PATCH /api/v1/organizations/:orgId/categories/:categoryId
```

### 5.4 カテゴリ削除 (ORG_ADMIN)
```
DELETE /api/v1/organizations/:orgId/categories/:categoryId
```

---

## 6. 商品 API

### 6.1 商品一覧
```
GET /api/v1/organizations/:orgId/products
```

**Query Parameters:**
- `categoryId` (optional): カテゴリでフィルタ
- `isActive` (optional): 有効/無効フィルタ

### 6.2 商品詳細
```
GET /api/v1/organizations/:orgId/products/:productId
```

### 6.3 商品作成 (ORG_ADMIN)
```
POST /api/v1/organizations/:orgId/products
```

**Request:**
```json
{
  "name": "たこ焼き",
  "price": 300,
  "categoryId": "category-uuid",
  "stock": 100
}
```

### 6.4 商品更新 (ORG_ADMIN)
```
PATCH /api/v1/organizations/:orgId/products/:productId
```

### 6.5 商品削除（論理削除）(ORG_ADMIN)
```
DELETE /api/v1/organizations/:orgId/products/:productId
```

### 6.6 在庫更新
```
PATCH /api/v1/organizations/:orgId/products/:productId/stock
```

**Request:**
```json
{
  "changeAmount": 50,
  "reason": "REPLENISH"
}
```

### 6.7 売り切れ切替
```
PATCH /api/v1/organizations/:orgId/products/:productId/availability
```

**Request:**
```json
{
  "isActive": false
}
```

---

## 7. 割引 API

### 7.1 割引一覧
```
GET /api/v1/organizations/:orgId/discounts
```

### 7.2 割引作成 (ORG_ADMIN)
```
POST /api/v1/organizations/:orgId/discounts
```

**Request:**
```json
{
  "name": "タイムセール",
  "type": "PERCENT",
  "value": 10
}
```

### 7.3 割引更新 (ORG_ADMIN)
```
PATCH /api/v1/organizations/:orgId/discounts/:discountId
```

### 7.4 割引削除 (ORG_ADMIN)
```
DELETE /api/v1/organizations/:orgId/discounts/:discountId
```

---

## 8. 取引（トランザクション）API

### 8.1 取引作成（会計開始）
```
POST /api/v1/organizations/:orgId/transactions
```

**Request:**
```json
{
  "items": [
    { "productId": "prod-uuid-1", "quantity": 2 },
    { "productId": "prod-uuid-2", "quantity": 1 }
  ],
  "discountId": "discount-uuid",
  "paymentMethod": "CASH"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "txn-uuid",
    "totalAmount": 1000,
    "discountAmount": 100,
    "paymentMethod": "CASH",
    "status": "PENDING",
    "items": [...]
  }
}
```

### 8.2 現金決済完了
```
POST /api/v1/organizations/:orgId/transactions/:txnId/complete-cash
```

**Request:**
```json
{
  "receivedAmount": 1500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "changeAmount": 500,
    "status": "COMPLETED"
  }
}
```

### 8.3 PayPay決済開始
```
POST /api/v1/organizations/:orgId/transactions/:txnId/paypay/create
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://qr.paypay.ne.jp/...",
    "deepLink": "paypay://...",
    "expiresAt": "2026-02-03T07:00:00Z"
  }
}
```

### 8.4 PayPay決済状態確認
```
GET /api/v1/organizations/:orgId/transactions/:txnId/paypay/status
```

### 8.5 取引キャンセル
```
POST /api/v1/organizations/:orgId/transactions/:txnId/cancel
```

### 8.6 取引一覧
```
GET /api/v1/organizations/:orgId/transactions
```

**Query Parameters:**
- `status` (optional): PENDING, COMPLETED, CANCELLED, REFUNDED
- `paymentMethod` (optional): CASH, PAYPAY
- `from` (optional): 開始日時
- `to` (optional): 終了日時
- `page` (optional): ページ番号
- `limit` (optional): 件数（デフォルト: 20）

### 8.7 取引詳細
```
GET /api/v1/organizations/:orgId/transactions/:txnId
```

### 8.8 返金（PayPayのみ）(ORG_ADMIN)
```
POST /api/v1/organizations/:orgId/transactions/:txnId/refund
```

---

## 9. レジ締め API

### 9.1 レジ締め作成 (ORG_ADMIN)
```
POST /api/v1/organizations/:orgId/cash-reports
```

**Request:**
```json
{
  "openingCash": 10000,
  "actualCash": 58500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "report-uuid",
    "openingCash": 10000,
    "theoreticalSales": 48000,
    "actualCash": 58500,
    "difference": 500
  }
}
```

### 9.2 レジ締め履歴
```
GET /api/v1/organizations/:orgId/cash-reports
```

---

## 10. 分析 API

### 10.1 売上サマリー
```
GET /api/v1/organizations/:orgId/analytics/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSales": 48500,
    "transactionCount": 62,
    "averageTransaction": 782,
    "paymentBreakdown": {
      "CASH": 30000,
      "PAYPAY": 18500
    }
  }
}
```

### 10.2 時間別売上
```
GET /api/v1/organizations/:orgId/analytics/hourly
```

### 10.3 商品別ランキング
```
GET /api/v1/organizations/:orgId/analytics/products
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "productId": "...", "name": "たこ焼き", "quantity": 40, "revenue": 12000 },
    { "productId": "...", "name": "焼きそば", "quantity": 25, "revenue": 10000 }
  ]
}
```

---

## 11. システム管理 API (SYSTEM_ADMIN)

### 11.1 全体ダッシュボード
```
GET /api/v1/admin/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSales": 523000,
    "activeOrganizations": 18,
    "totalOrganizations": 20,
    "transactionCount": 847,
    "categoryBreakdown": [
      { "category": "フード", "revenue": 312000, "percentage": 59.7 },
      { "category": "ドリンク", "revenue": 156000, "percentage": 29.8 }
    ]
  }
}
```

### 11.2 団体別売上一覧
```
GET /api/v1/admin/organizations/sales
```

### 11.3 カテゴリ別売上
```
GET /api/v1/admin/analytics/categories
```

### 11.4 監査ログ一覧
```
GET /api/v1/admin/audit-logs
```

**Query Parameters:**
- `organizationId` (optional)
- `userId` (optional)
- `action` (optional)
- `from` (optional)
- `to` (optional)

### 11.5 監査ログ詳細
```
GET /api/v1/admin/audit-logs/:logId
```

### 11.6 システム設定取得
```
GET /api/v1/admin/settings
```

### 11.7 システム設定更新
```
PATCH /api/v1/admin/settings
```

**Request:**
```json
{
  "eventDate": "2026-10-15",
  "eventStartTime": "10:00",
  "eventEndTime": "18:00",
  "systemEnabled": true
}
```

### 11.8 緊急システム停止
```
POST /api/v1/admin/emergency-stop
```

---

## 12. PayPay Webhook

### 12.1 決済完了通知
```
POST /api/v1/webhooks/paypay
```

> ⚠️ **署名検証必須**: `X-PayPay-Signature` ヘッダーで検証

---

## 13. WebSocket (Socket.io)

### 13.1 接続
```
wss://example.com/socket.io
```

### 13.2 イベント

| イベント名 | 方向 | 説明 |
|-----------|------|------|
| `join:organization` | Client → Server | 団体ルームに参加 |
| `transaction:completed` | Server → Client | 取引完了通知 |
| `product:updated` | Server → Client | 商品情報更新通知 |
| `product:soldout` | Server → Client | 売り切れ通知 |

---

## 14. エラーコード一覧

| コード | 説明 |
|--------|------|
| `AUTH_INVALID_CREDENTIALS` | メール/パスワードが不正 |
| `AUTH_TOKEN_EXPIRED` | トークン期限切れ |
| `AUTH_UNAUTHORIZED` | 認証が必要 |
| `AUTH_FORBIDDEN` | 権限なし |
| `USER_SUSPENDED` | アカウントが停止されています |
| `USER_DEACTIVATED` | アカウントが退会済みです |
| `ORG_NOT_FOUND` | 団体が見つからない |
| `ORG_INACTIVE` | 団体が無効化されています |
| `ORG_INVALID_INVITE_CODE` | 招待コードが不正 |
| `PRODUCT_NOT_FOUND` | 商品が見つからない |
| `PRODUCT_SOLD_OUT` | 在庫切れ |
| `PRODUCT_INSUFFICIENT_STOCK` | 在庫不足 |
| `CATEGORY_NOT_FOUND` | カテゴリが見つからない |
| `DISCOUNT_NOT_FOUND` | 割引が見つからない |
| `DISCOUNT_INACTIVE` | 割引が無効です |
| `TXN_NOT_FOUND` | 取引が見つからない |
| `TXN_ALREADY_COMPLETED` | 既に完了した取引 |
| `TXN_CANNOT_REFUND` | 返金不可（現金取引等） |
| `PAYPAY_CREATE_FAILED` | PayPay QR生成失敗 |
| `PAYPAY_TIMEOUT` | PayPay決済タイムアウト |
| `PAYPAY_REFUND_FAILED` | PayPay返金失敗 |
| `SYSTEM_DISABLED` | システム停止中 |
| `VALIDATION_ERROR` | 入力値が不正 |
