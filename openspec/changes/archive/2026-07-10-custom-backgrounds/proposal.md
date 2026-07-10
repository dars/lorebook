# Proposal: custom-backgrounds

## Why

`srd-content-baseline` 收斂後,內建背景僅剩 SRD 5.2 的 4 個(侍僧/罪犯/賢者/士兵),是建角流程最有感的選項缺口。依 content-scope 政策,「使用者自訂資料」是合法的內容來源——自訂背景是 homebrew 機制的第一步:2024 背景結構規整(三屬性加值候選、兩固定技能、一個起源專長),適合作為自訂表單的起點,且 DM 自訂背景本就是 2024 官方建議玩法。

## What Changes

- **新增自訂背景資料模型與儲存**:使用者自有資料(比照 `user_characters`)——新表 `user_backgrounds`,跨裝置同步、RLS 僅本人存取、雲端軟刪除(tombstone)。
- **自訂背景編輯器 UI**:建立/編輯/刪除表單——名稱、三個能力值加值候選(不重複)、兩個固定技能(自 18 技能選)、起源專長(自 SRD 4 個起源專長選;法術新手含法師/牧師/德魯伊變體)、敘述文字。
- **建角流程整合**:背景步驟並列顯示「內建 4 個 + 使用者自訂」選項,自訂背景選取後的敘述/重點提示、能力值加值卡、技能自動帶入等行為與內建背景一致;背景步驟提供新增自訂背景入口。
- **角色卡不變**:角色儲存的背景為建卡時快照(`background`/`backgroundEn` 字串與衍生數值),自訂背景刪除/修改不影響既有角色。
- homebrew 子職業/專長/法術**不在本次範圍**,之後另開 change。

## Capabilities

### New Capabilities

- `custom-backgrounds`: 使用者自訂背景的建立/編輯/刪除、儲存與同步(RLS、軟刪除)、資料驗證(能力值/技能/起源專長的合法組合),以及與建角選項的合併供給。

### Modified Capabilities

- `character-management`: 「新增角色(簡化版)」的背景選擇——由僅內建精選選項,改為內建 + 使用者自訂並列,並提供自訂背景的新增入口。

## Impact

- **資料層**:使用者自有資料(App 自身 Supabase 專案)。新表 `user_backgrounds` 完全沿用 `user_characters` 的文件模式:`id`(客戶端產生)、`user_id`(auth.users)、提升欄位 `name text`、`data jsonb`(完整自訂背景文件:abilities/skills/originFeat/description)、`created_at`/`updated_at`(LWW trigger)/`deleted_at`(tombstone)。RLS 與 grants 比照 `user_characters`(own-row select/insert/update/delete、revoke anon)。不涉及 Campaign 即時同步;內容 Supabase(唯讀庫)完全不動。
- **程式碼**:
  - `supabase/migrations/0004_user_backgrounds.sql`(新 migration + RLS)
  - `lib/features/character/`:自訂背景 repository + Riverpod provider、編輯器頁/對話框、建角背景步驟的選項合併(`character_creation_data.dart` 的 `BackgroundOption` 結構沿用)
  - 測試:表單驗證、選項合併、快照行為
- **版型**:手機與平板皆有——編輯器表單在 compact 為全頁、medium/expanded 沿用單欄置中限寬;背景選擇區沿用既有選項卡排列,無結構性變更。
- **依賴**:無新第三方套件。
