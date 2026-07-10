# Proposal: rules-core-2024-5r

## Why

App 的角色規則邏輯（建角、升級、施法進程等本地權威表）已按 D&D 2024（5r）實作，但內容庫查詢固定書源 `PHB`（2014 年版），且內容 Supabase 完全沒有 XPHB（2024）資料。造成規則邏輯與顯示內容版本不一致——例如力竭（Exhaustion）需自撰 2024 全文繞過內容庫的 2014 效果表。本 change 將規則核心（內容庫書源）統一切換為 2024 修訂版（XPHB）。

## What Changes

- **內容庫資料（外部 `../5etools` repo + 內容 Supabase 專案）**：
  - 自上游 5etools 同步 XPHB（2024）資料至繁中 fork
  - 完成 XPHB 資料的繁體中文翻譯（**翻譯後才匯入**，維持內容庫全繁中的一致性）
  - 以 `import_to_supabase.py` 匯入 XPHB 資料為新書源列，**不刪除既有 PHB 資料**（保留表內的 PHB 列）
  - **內容庫瘦身**：刪除整張無程式路徑的 `monsters`、`spell_classes` 表與 `v_search`、`v_optionalfeatures` view；XPHB 轉檔一律跳過這些資料域，匯入 script 同步移除對應邏輯。`items`/`v_items` 保留（未來裝備目錄功能會用，XPHB items 批次可延後）、`sources` 書目對照保留
- **App 端（本 repo）**：
  - `kCatalogSource` 由 `'PHB'` 改為 `'XPHB'`，所有目錄查詢（法術、職業、子職業、種族、背景、專長、物品、長尾條目）改讀 2024 內容
  - 力竭規則全文改回內容庫來源（XPHB 已是 2024 版效果，不再需要本地自撰全文繞過）
  - 校驗本地權威表（`character_math.dart`、`character_creation_data.dart`）與匯入後的 XPHB 內容一致
  - 更新測試 fixtures 的書源標記
- 無 **BREAKING**：使用者既有角色卡資料為建卡時的快照，不受書源切換影響；App 本身無 schema 變更。

## Capabilities

### New Capabilities

- `catalog-source`: 內容庫書源政策——App 所有內容庫查詢 SHALL 限定單一書源，且該書源為 2024 修訂版（XPHB）；書源常數集中定義、可於建構時注入替換。

### Modified Capabilities

- `spell-catalog`: 法術目錄查詢的固定書源由 PHB（2014）改為 XPHB（2024）。
- `decision`: 力竭（Exhaustion）規則全文的來源由「本地自撰 2024 文字」改為「內容庫 XPHB 全文」（顯示行為不變，仍為 2024 規則內容；離線降級為本地摘要的行為維持）。

## Impact

- **資料層**：只影響「靜態遊戲資料」層（外部內容 Supabase 專案 `nmzvywrgefodpqdsqvsf`，唯讀內容庫）。新增 XPHB 資料列於既有表（`spells`、`classes`、`subclasses`、`races`、`backgrounds`、`feats`、`entries` 等），**無新資料表**、RLS 政策沿用（公開唯讀）；另刪除未使用的 `monsters`、`spell_classes` 表與 `v_search`、`v_optionalfeatures` view（不可逆，但 5etools 原始資料仍在，可隨時重建）。角色卡資料與 Campaign 資料完全不動。
- **程式碼（本 repo）**：
  - `lib/features/catalog/data/catalog_repository.dart`（`kCatalogSource`）
  - `lib/features/decision/presentation/sections/status_section.dart`（力竭全文改讀內容庫）
  - `test/features/catalog/`、`test/features/character/` 相關 fixtures
- **外部 repo**：`../5etools`（上游資料同步、繁中翻譯、`scripts/import_to_supabase.py` 匯入；翻譯工作量大，為本 change 的主要時程瓶頸）
- **版型**：手機與平板皆不受影響（純資料來源切換，無 UI 結構變更）
- **進行中的 changes**：`class-choice-features`、`level-up-flow` 均透過 `CatalogRepository` 查詢，書源切換後自動生效；建議該兩項先行完成或於實作時協調順序。
- **依賴**：無新第三方套件。
