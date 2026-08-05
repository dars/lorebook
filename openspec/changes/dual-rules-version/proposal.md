> **⛔ 已凍結（2026-08-05）**：專案改為 web-only 並以 Next.js 全面重寫
> （`web-only-nextjs-migration`）。本變更**不在 Flutter 端實作**——在即將退場的
> 程式碼上開發是純粹的浪費。提案與設計保留：那是產品判斷，與實作語言無關。
> 解凍條件：Next.js 重寫完成並切換上線後，以新實作為前提更新 design。

## Why

目前 App 的規則核心單一綁定 D&D 2024（5r）：內容庫書源固定 `XPHB`（`kCatalogSource` 全域常數），本地權威表（`character_math.dart`、`character_creation_data.dart`、`class_resources.dart`、`level_up.dart`）也全是 2024 數值與結構。但 D&D 5e（2014）仍是大量團的實際使用版本，而 5e 與 5r 的差異不只是數字表：種族給屬性加值、背景結構、已知法術 vs 可備法術、子職取得等級都是結構性不同，無法以「換一份常數」帶過。

規則版本是本 App 最大的分支線——它決定建角每一步的選單來源、升級流程的節點、以及內容庫查哪一份資料。因此版本必須是**角色的一級屬性**，在建角最初就決定、建立後不可變更。

## What Changes

- 新增規則版本域（`5e` = 2014 / `5r` = 2024），成為貫穿建角、升級、內容查詢的第一分支條件
- `Character` 新增 `rulesVersion` 欄位；既有角色一律視為 `5r`（`@Default('5r')`，jsonb 儲存故無 schema migration）
- **BREAKING**（對規則層而言）：規則常數不再是全域單一份。`character_math.dart` / `character_creation_data.dart` / `class_resources.dart` / `level_up.dart` 的版本相依常數與公式抽取為 `RuleSet` 介面，2024 為第一個實作，2014 為第二個實作
- **BREAKING**（對內容層而言）：`kCatalogSource` 全域常數退場，改為依規則版本解析書源（`5r` → `XPHB`、`5e` → `PHB`）。`catalogRepositoryProvider` 與其下 9 個目錄 provider 全數加上版本維度
- 建角流程新增「規則版本」為第一步，選定後才進入基本步驟；中途回頭改版本 SHALL 清空後續所有選擇並經確認
- 角色清單卡片顯示規則版本標示（5e / 5r）
- 角色建立後 `rulesVersion` 為唯讀，App 不提供任何版本轉換路徑
- 自訂背景（`CustomBackground`）綁定規則版本：欄位結構依版本不同（5r = 能力加值候選＋起源專長；5e = 技能＋工具/語言＋背景特性），建角時僅列出同版本的自訂背景
- 內容庫重新引入 SRD 5.1（2014，`PHB` 書源）繁中資料；匯入管線的 SRD 過濾標記依版本切換（`srd52` / `srd`）
- 內容範圍政策擴充為「SRD 5.2 + SRD 5.1」，兩者皆為 CC-BY-4.0；App 內授權聲明補上 SRD 5.1 attribution
- 力竭（Exhaustion）規則全文與等級語意依版本呈現（5r 為每級 −2 累加、5e 為六級效果表）
- **BREAKING**（對建角流程而言）：建角改為要求內容庫可用——內容庫不可用時停用「新增角色」入口，法術步驟不再提供「跳過」，以免產出法術與職業特性永久缺漏的角色。既有角色的檢視與使用維持完全離線可用

## Capabilities

### New Capabilities
- `rules-version`: 規則版本域——版本列舉與預設、綁定於角色與自訂背景、建立後不可變更、版本如何解析為「本地權威表」與「內容庫書源」的單一入口

### Modified Capabilities
- `catalog-source`: 由「全域單一書源 XPHB」改為「依當前規則版本解析書源（XPHB / PHB）」；內容庫資料涵蓋要求擴及 PHB（SRD 5.1）資料域
- `content-scope`: 內容範圍由「僅 SRD 5.2」擴為「SRD 5.2 與 SRD 5.1」；匯入過濾標記依版本；授權聲明涵蓋兩份 SRD
- `character-management`: 建角流程新增規則版本步驟（第一步）；角色清單卡片顯示版本標示；建角各步驟的選單來源依版本解析
- `custom-backgrounds`: 自訂背景綁定規則版本，欄位結構與編輯表單依版本不同；建角背景清單僅列同版自訂背景
- `spell-catalog`: 法術目錄查詢書源由固定 XPHB 改為依版本解析
- `item-catalog`: 裝備目錄查詢書源由固定 XPHB 改為依版本解析
- `class-resource-derivation`: 職業資源規則表依版本（2014 為氣點／狂暴次數／第二風等不同進程）
- `decision`: 力竭規則全文與等級效果依角色的規則版本呈現，離線降級摘要亦分版

## Impact

**資料層分類**：只影響「靜態遊戲資料」與「角色卡資料」兩層，Campaign 共用資料完全不動；無 Realtime 訂閱異動。

- **靜態遊戲資料（外部內容 Supabase 專案 `nmzvywrgefodpqdsqvsf`，唯讀）**：於既有表新增 `source = 'PHB'` 資料列（`spells`/`classes`/`subclasses`/`class_features`/`races`/`backgrounds`/`feats`/`entries`/`items`），**無新資料表**、RLS 沿用公開唯讀。`import_to_supabase.py` 需支援依版本切換 SRD 過濾標記。
- **角色卡資料（`user_characters`）**：`Character` 文件內新增 `rulesVersion` 欄位，存於既有 `data jsonb`，**無 schema migration、無 RLS 異動**。`fetchAll()` 已是 `select('data')` 整份下載，清單徽章不需新增提升欄位。
- **自訂背景（`user_backgrounds`）**：`CustomBackground` 新增 `rulesVersion` 與 5e 專屬欄位；儲存形式待 design 判定是否需 migration（既有列一律視為 `5r`）。

**程式碼影響**：

- `lib/features/catalog/data/catalog_repository.dart`：`kCatalogSource` 退場、repository 與 9 個目錄 provider 版本化
- 39 處目錄 provider 呼叫點，散於 7 個 lib 檔（`character_create_page.dart`、`character_level_up_page.dart`、`inventory_tab.dart`、`item_catalog_picker.dart`、`status_section.dart`、`character_header.dart`、`character_sync_repository.dart`）與 2 個測試檔
- `lib/features/character/domain/`：`character_math.dart`、`character_creation_data.dart`、`class_resources.dart`、`level_up.dart`、`derived_stats.dart`、`character.dart`、`custom_background.dart`
- `lib/features/character/presentation/`：`character_create_page.dart`（2678 行）、`character_level_up_page.dart`（1667 行）、`character_select_page.dart`、`custom_background_edit_page.dart`
- 既有 20 個測試檔多數綁 2024 數值，需參數化為雙版

**版型影響**：手機與平板皆受影響，但僅為既有頁面新增一個步驟與一個標示，無新版型分支。

**In-flight 衝突**：`openspec/changes/` 下 `character-progression`、`class-choice-features`、`level-up-flow`、`active-effects` 皆觸及升級流程與職業資源，實作順序需與本 change 協調。

**依賴**：不引入任何新第三方套件。
