## MODIFIED Requirements

### Requirement: 內容庫單一書源政策（2024 修訂版）
App 所有內容庫查詢（法術、職業、子職業、種族、背景、專長、物品、長尾條目等）SHALL 限定單一書源，且該書源 SHALL 由當前規則版本解析而得（`5r` → `XPHB`、`5e` → `PHB`），SHALL NOT 為全域固定值。版本至書源的映射 SHALL 集中於單一解析點（見 `rules-version` 規格），並保留 repository 建構時注入替換的能力；除該解析點與測試注入外，程式碼不得散落書源字面值。

未指定版本的情境（如既有角色缺 `rulesVersion`）SHALL 解析為 `5r`。

#### Scenario: 查詢限定當前版本書源
- **WHEN** App 透過 `CatalogRepository` 以版本 `5r` 查詢任一內容目錄
- **THEN** 查詢條件固定過濾 `source = 'XPHB'`，回傳 2024 修訂版內容
- **WHEN** 以版本 `5e` 查詢
- **THEN** 查詢條件固定過濾 `source = 'PHB'`，回傳 2014 版內容

#### Scenario: 書源可注入替換
- **WHEN** 測試以建構參數注入特定書源建立 repository
- **THEN** 該 repository 的所有查詢改用注入書源，無需修改其他程式碼

#### Scenario: 無版本時的預設
- **WHEN** 查詢情境未帶規則版本
- **THEN** 解析為 `5r`（`XPHB`），行為與本 change 之前一致

### Requirement: 內容庫 XPHB 資料涵蓋
內容庫（外部 Supabase 內容專案）SHALL 收錄繁體中文的兩份規則版本資料，且各自僅限該版 SRD 範圍者：

- `source = 'XPHB'`（2024 核心）：屬 SRD 5.2 範圍者，以 `srd = true` 標記
- `source = 'PHB'`（2014 核心）：屬 SRD 5.1 範圍者，以 `srd = true` 標記

兩份資料 SHALL 至少涵蓋：異常狀態（含力竭）、職業與子職業（含職業特性）、種族（Species/Race）、背景、專長、法術、裝備（items）。裝備資料 SHALL 含類別（武器/護甲/冒險裝備/工具）、子分類（`subcategory`，分組瀏覽用：武器分簡易/軍用×近戰/遠程、護甲分輕/中/重/盾、冒險裝備依用途）、價格（`price_cp` 整數，cp 計）、重量，以及機制欄位：武器條目含傷害骰、傷害類型、屬性標籤（finesse/two-handed 等）；護甲條目含 AC 公式參數（基值、護甲類別、Dex 上限）。

匯入管線 SHALL 依目標版本切換上游 SRD 標記過濾（`XPHB` 依 `srd52`、`PHB` 依 `srd`）。內容庫 SHALL NOT 保留任何非 SRD 資料列：兩書源中無對應 SRD 標記的條目 SHALL NOT 匯入。兩書源的資料列 SHALL 共存，新增其一 SHALL NOT 影響另一。

#### Scenario: 核心資料域筆數非空且為 SRD 範圍
- **WHEN** 以 `source = 'XPHB'` 查詢 conditions/classes/subclasses/races/backgrounds/feats/spells 各表
- **THEN** 各表皆回傳非空結果，文字內容為繁體中文，且筆數與 SRD 5.2 覆蓋一致（conditions 15/classes 12/subclasses 12/races 9/backgrounds 4/feats 17/spells 339）
- **WHEN** 以 `source = 'PHB'` 查詢同樣各表
- **THEN** 各表皆回傳非空結果，文字內容為繁體中文，且筆數與 SRD 5.1 覆蓋一致（conditions 15/classes 12/subclasses 12/races 9〔含 SRD 亞種 6〕/backgrounds 1/feats 1/spells 319/optionalfeatures 49）

#### Scenario: 裝備資料域非空且欄位完整
- **WHEN** 以任一書源查詢 `items`（經 `v_items`）
- **THEN** 回傳非空結果，涵蓋武器/護甲/冒險裝備/工具四類，各列含中文名稱、類別、`price_cp` 整數與重量；武器列含傷害骰/傷害類型/屬性標籤，護甲列含 AC 公式參數

#### Scenario: 非 SRD 資料列不存在
- **WHEN** 以 `srd = false` 查詢任一書源的資料列
- **THEN** 回傳空結果

#### Scenario: 兩書源互不影響
- **WHEN** 重匯 `PHB` 資料域
- **THEN** `XPHB` 資料列筆數與內容不變
