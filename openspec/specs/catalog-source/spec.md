# catalog-source Specification

## Purpose
TBD - created by archiving change rules-core-2024-5r. Update Purpose after archive.
## Requirements
### Requirement: 內容庫單一書源政策（2024 修訂版）
App 所有內容庫查詢（法術、職業、子職業、種族、背景、專長、物品、長尾條目等）SHALL 限定單一書源，且該書源 SHALL 為 D&D 2024 修訂版（`XPHB`）。書源代碼 SHALL 集中於單一常數定義（`kCatalogSource`），並保留 repository 建構時注入替換的能力；除該常數與測試注入外，程式碼不得散落書源字面值。

#### Scenario: 全域查詢限定 XPHB
- **WHEN** App 透過 `CatalogRepository` 查詢任一內容目錄
- **THEN** 查詢條件固定過濾 `source = 'XPHB'`，回傳 2024 修訂版內容

#### Scenario: 書源可注入替換
- **WHEN** 測試以建構參數注入其他書源（如 `'PHB'`）建立 repository
- **THEN** 該 repository 的所有查詢改用注入書源，無需修改其他程式碼

### Requirement: 內容庫 XPHB 資料涵蓋
內容庫(外部 Supabase 內容專案)SHALL 收錄繁體中文的 XPHB(2024 核心)資料中屬 SRD 5.2 範圍者,至少涵蓋:異常狀態(含力竭)、職業與子職業(含職業特性)、種族(Species)、背景、專長、法術;資料列以 `source = 'XPHB'` 標記且 `srd = true`。內容庫 SHALL NOT 保留任何非 SRD 資料列:PHB(2014)書源列與 XPHB 中無 srd52 標記的條目 SHALL 刪除(fork 原始資料保留,可重建)。

#### Scenario: 核心資料域筆數非空且為 SRD 範圍
- **WHEN** 以 `source = 'XPHB'` 查詢 conditions/classes/subclasses/races/backgrounds/feats/spells 各表
- **THEN** 各表皆回傳非空結果,文字內容為繁體中文,且筆數與 SRD 5.2 覆蓋一致(conditions 15/classes 12/subclasses 12/races 9/backgrounds 4/feats 17/spells 339)

#### Scenario: 非 SRD 資料列已清除
- **WHEN** 以 `source = 'PHB'` 查詢任一內容表,或以 `srd = false` 查詢 `source = 'XPHB'` 的列
- **THEN** 均回傳空結果

### Requirement: 內容庫不含無程式路徑的資料表
內容庫 SHALL 移除整張無任何程式路徑的資料表與 view（`monsters`、`spell_classes`、`v_search`、`v_optionalfeatures`），且匯入工具 SHALL 不再重建或寫入這些資料域；有既定用途的 `items`／`v_items`（裝備目錄 roadmap）與 `sources`（書目對照）SHALL 保留。

#### Scenario: 死表已移除且不再重建
- **WHEN** 內容庫瘦身與 XPHB 匯入全部完成後檢視 public schema
- **THEN** 不存在 `monsters`、`spell_classes` 表與 `v_search`、`v_optionalfeatures` view
- **THEN** `items`、`v_items`、`sources` 仍存在

