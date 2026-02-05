# 割引機能の柔軟化に向けた提案書

**作成日:** 2026年2月5日  
**更新日:** 2026年2月5日  
**作成者:** AIアシスタント

---

## 1. 現状の課題と目的

現在のPOSシステムでは、割引機能に関して以下の制約があります。
1. **対象範囲の限定**: 注文合計金額に対する割引のみが可能で、特定の商品（例：「焼きそば」のみ）を対象とした割引ができません。
2. **条件設定の欠如**: 「3個以上購入で割引」「1000円以上購入で割引」といった条件付きの自動割引を設定できません。
3. **適用タイミング・期間の柔軟性**: 自動/手動の使い分けや、タイムセールのような時間限定設定ができません。

本提案では、これらの課題を解決し、学園祭等のイベントで想定される多様な割引パターン（タイムセール、セット割、大量購入特典など）に対応できるデータモデルとロジックを提示します。

---

## 2. データモデル変更案

`Discount`（割引設定）モデルを拡張し、適用対象（Target）、適用条件（Condition）、適用トリガー（Trigger）、有効期間（Validity）を持たせます。

### 2.1 Prisma Schema 変更案

```prisma
// 新規 Enum: 割引の適用対象
enum DiscountTargetType {
  ORDER_TOTAL      // 注文全体（既存）
  SPECIFIC_PROD    // 特定の商品
  CATEGORY         // 特定のカテゴリ（将来拡張用）
}

// 新規 Enum: 割引の適用条件（ロジック判定用）
enum DiscountConditionType {
  NONE             // 無条件
  MIN_QUANTITY     // 最低個数（例: 3個以上）
  MIN_AMOUNT       // 最低金額（例: 1000円以上）
}

// 新規 Enum: 適用トリガー（手動/自動）
enum DiscountTriggerType {
  MANUAL           // 手動選択（ボタン押下等で適用）
  AUTO             // 自動適用（条件を満たした瞬間に適用）
}

model Discount {
  id             String                @id @default(uuid())
  organizationId String
  organization   Organization          @relation(fields: [organizationId], references: [id])
  
  name           String                // 割引名
  type           DiscountType          // FIXED (定額), PERCENT (定率)
  value          Int                   // 割引値
  
  // --- 対象設定 ---
  targetType     DiscountTargetType    @default(ORDER_TOTAL)
  
  // SPECIFIC_PROD の場合の対象商品ID（NULL可）
  targetProductId String?
  product         Product?             @relation(fields: [targetProductId], references: [id])

  // --- 条件設定 ---
  conditionType  DiscountConditionType @default(NONE)
  conditionValue Int                   @default(0) // 閾値（3個、1000円など）
  
  // --- トリガー設定（新規追加） ---
  triggerType    DiscountTriggerType   @default(MANUAL) // 手動か自動か
  
  // --- 有効期間設定（新規追加） ---
  validFrom      DateTime?             // 開始日時（NULLなら無期限/即時）
  validTo        DateTime?             // 終了日時（NULLなら無期限）
  
  priority       Int                   @default(0) // 優先度（特に自動適用時の競合解決用）
  // -------------------

  isActive       Boolean               @default(true) // マスタとしての有効無効
  transactions   Transaction[]
}
```

### 2.2 取引明細（TransactionItem）への記録（変更なし）

```prisma
model TransactionItem {
  id            String      @id @default(uuid())
  // ...既存フィールド...
  
  unitPrice     Int         // 割引適用後の単価
  originalPrice Int         // 定価
  discountAmount Int        // 商品単体の割引額
  appliedDiscountId String? // 適用された割引ID
  discount      Discount?   @relation(fields: [appliedDiscountId], references: [id])
}
```

---

## 3. 具体的なユースケースと設定例

### ケースA: 「焼きそば」50円引きタイムセール（時間限定・自動）
*   **Target**: `SPECIFIC_PROD` (焼きそば)
*   **Trigger**: `AUTO` (自動)
*   **Time**: 12:00 ~ 13:00
*   **振る舞い**: 指定時間内に焼きそばをカートに入れると、**自動的に**50円引きになる。時間が過ぎると通常価格に戻る。

### ケースB: ドリンク3本以上でセット割（条件付き・自動）
*   **Target**: `SPECIFIC_PROD` (ドリンク)
*   **Condition**: `MIN_QUANTITY` (3本以上)
*   **Trigger**: `AUTO` (自動)
*   **振る舞い**: カート内のドリンクが3本以上になった瞬間、当該商品の単価が割引価格になる。

### ケースC: スタッフ割（条件なし・手動）
*   **Target**: `ORDER_TOTAL`
*   **Condition**: `NONE`
*   **Trigger**: `MANUAL` (手動)
*   **振る舞い**: 会計画面で「スタッフ割」ボタンを押すと適用される。条件がないため、いつでも押せる。

### ケースD: クーポン持参で10%OFF（条件あり・手動）
*   **Target**: `ORDER_TOTAL`
*   **Condition**: `MIN_AMOUNT` (1000円以上)
*   **Trigger**: `MANUAL` (手動)
*   **振る舞い**: 会計が1000円を超えている時のみ、「クーポン適用」ボタンが有効化（あるいは押下成功）する。

---

## 4. 適用ロジック概要

### 有効性判定 (`isValid`)
ある割引が現在「利用可能」かどうかの判定フロー：
1.  `isActive` が `true` か？
2.  現在時刻が `validFrom` ～ `validTo` の範囲内か？
3.  （手動適用の際）カート内容が `conditionType` / `conditionValue` を満たしているか？

### 自動適用フロー (`AUTO`)
カート内容変更のたびに再計算します。
1.  Targetに合致する商品/全体に対して、有効な `AUTO` 割引リストを抽出。
2.  条件（個数・金額・時間）を満たすものをフィルタリング。
3.  競合する場合は `priority` 等で1つ決定し適用。

---

## 5. UI/UX への影響

### 管理画面（割引設定）
*   **トリガー選択**: 「自動適用」「手動適用」のラジオボタン等の追加。
*   **期間設定**: 開始日時・終了日時を選択するDate Pickerの追加（任意設定）。

### POSレジ画面
*   **自動適用**: ユーザー操作なしで価格が書き換わるため、「タイムセール適用中 -50円」のようなバッジや注釈を表示して分かりやすくする必要があります。
*   **手動適用**: 割引選択モーダル等で、現在期間外の割引は非表示にするかグレーアウトする必要があります。

---

## 6. 今後の進め方

1.  `schema.prisma` の更新とマイグレーション
2.  シードデータの修正（テスト用に期間指定割引などを追加）
3.  バックエンドAPIの計算ロジック改修
4.  フロントエンド（管理画面・POS画面）の改修

以上、修正案となります。
