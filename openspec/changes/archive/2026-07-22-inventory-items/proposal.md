# Proposal: inventory-items

## Why

遊玩過程中角色會持續取得物品（商店購買、任務獲得、DM 發放），但目前物品頁只能顯示創角時帶入的靜態裝備清單：`Equipment` 模型沒有數量、沒有類型/來源區分、沒有任務物品概念，也沒有任何新增/編輯/刪除入口——玩家在跑團中最頻繁的「買東西、用消耗品、撿任務物品」都無法記錄。內容庫已為裝備目錄保留 `items`/`v_items` 表（catalog-source roadmap），是接上這條缺口的時機。

## What Changes

- **物品資料模型擴充**（**BREAKING**：`Equipment` 欄位擴充，既有角色 JSON 需相容遷移）
  - 類型（type）：武器／護甲／一般裝備／消耗品——決定行為（可裝備、可消耗）
  - 來源（source）：內容庫（SRD 裝備目錄）／自訂（玩家自產內容）——決定資料怎麼來
  - 數量（quantity）：消耗品與可堆疊物品的核心欄位，使用即遞減
  - 任務旗標（quest）：正交於類型的保護標記——不可販售、刪除需二次確認
- **內容庫 SRD 裝備目錄**：啟用既有 `items`/`v_items` 表，收錄 SRD 5.2 範圍的 XPHB 裝備（武器、護甲、冒險裝備、工具，含價格/重量/規則文字），App 端提供瀏覽與搜尋
- **物品頁互動**：新增物品（從內容庫選單挑選，或自訂輸入）、調整數量／使用消耗品、裝備/卸下、刪除（任務物品加確認）
- **商店購買流程**：從內容庫挑物品時帶出 SRD 價格（成交金額可修改，DM 自訂規則），確認購買自動經財富計算機邏輯扣款（幣別換算沿用現有 `adjustCurrency`）
- **裝備效果**（**BREAKING**：`ac` 由靜態欄位改為推導值、靜態 `weapons` 清單退場改由物品欄推導）
  - 護甲裝備/卸下影響 AC：依 SRD 公式推導（無甲 10+Dex、輕/中/重甲、盾牌 +2、無甲防禦職業特性）
  - 武器裝備後出現在行動頁攻擊列（命中/傷害自屬性與目錄資料推導）
  - 攻擊列固定含「徒手攻擊」——2024 規則所有角色皆有（命中＝力調+熟練、傷害＝1+力調鈍擊），非特定職業專屬

## Capabilities

### New Capabilities

- `item-catalog`: App 端 SRD 裝備目錄的查詢與呈現——依類別瀏覽、關鍵字搜尋、單品詳情（價格/重量/規則文字）；資料來自內容庫 `items`/`v_items`，遵循 catalog-source 單一書源政策
- `inventory-items`: 角色物品欄的管理——類型/來源二維分類、數量與任務旗標、新增（目錄挑選/自訂輸入）、使用消耗品、裝備狀態切換、刪除保護、商店購買扣款
- `equipment-effects`: 裝備狀態對數值的推導——AC 公式引擎（含無甲防禦）、裝備中武器與固定徒手攻擊構成攻擊列

### Modified Capabilities

- `catalog-source`: 「內容庫 XPHB 資料涵蓋」需求擴充——`items` 資料域納入涵蓋範圍（SRD 5.2 範圍的裝備條目，`source = 'XPHB'` 且 `srd = true`），含機制欄位（武器傷害骰/傷害類型/屬性標籤、護甲 AC 公式參數），匯入管線比照既有資料域過濾
- `character-management`: 「物品頁」需求改寫——裝備清單從靜態顯示改為可管理的物品欄（分區呈現含類型/數量/任務標記、新增/編輯入口）
- `decision`: 「動作區段」攻擊列來源改寫——由裝備中武器＋固定徒手攻擊推導，不再讀靜態 `weapons` 清單

## Impact

- **資料層**：
  - 角色卡資料（使用者自有）：`Equipment` 模型擴充欄位，序列化 JSON 向後相容（新欄位帶預設值，舊資料讀入不失敗）；同步 payload 不變（仍是 character JSON 整包）
  - 靜態快取（唯讀）：內容庫新增 items 資料域，App 端 `CatalogRepository` 增加 items 查詢；無新資料表、無 RLS 變更（items 屬既有內容庫專案的唯讀表）
  - Campaign 共用資料：不涉及，無 Realtime 變更
- **程式碼**：`character.dart`（Equipment freezed 模型擴充；`ac` 轉推導、`weapons` 退場含舊資料轉換）、`character_providers.dart`（物品 CRUD notifier 方法）、`inventory_tab.dart`（物品頁 UI 與新增/編輯 sheet）、`actions_section.dart`／`status_section.dart`（攻擊列與 AC 改讀推導值）、`catalog_repository.dart`（items 查詢）；財富扣款複用既有 `adjustCurrency`
- **版型**：手機與平板皆影響（物品頁為角色頁次級 tab，兩版型共用同一份元件；新增/編輯以 bottom sheet 呈現，沿用現有 editor_sheet 共用元件）
- **套件**：無新增第三方套件
