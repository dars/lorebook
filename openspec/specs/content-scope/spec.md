# content-scope Specification

## Purpose
TBD - created by archiving change srd-content-baseline. Update Purpose after archive.
## Requirements
### Requirement: 內容範圍政策(SRD 5.2 + 使用者自訂)
App 的一切規則內容 SHALL 以 D&D 2024(5r)規則為基準,且 SHALL 僅來自 SRD 5.2(CC-BY-4.0)或使用者自訂資料;App SHALL NOT 收錄或顯示怪物、官方劇本/劇情內容,以及任何非 SRD 的官方出版內容。此政策 SHALL 明文記載於 CLAUDE.md、README 與 `openspec/config.yaml` 專案 context。玩家自產內容(角色卡、個人筆記、Campaign 共用筆記)不受此限制——政策排除的是官方出版內容,非使用者內容。

#### Scenario: 內容庫僅含 SRD 資料列
- **WHEN** 檢視內容庫任一內容表(spells/classes/subclasses/races/backgrounds/feats/conditions/optionalfeatures/entries)
- **THEN** 不存在任何非 SRD 5.2 的資料列(含 2014 PHB 書源列與 XPHB 中無 srd52 標記者)

#### Scenario: 各資料域筆數與 SRD 5.2 覆蓋一致
- **WHEN** 依書源查詢各內容表筆數
- **THEN** 與 SRD 5.2 覆蓋數一致:spells 339、classes 12、subclasses 12、backgrounds 4、feats 17、races 9、conditions 15、optionalfeatures 29

#### Scenario: 建角與升級選項限於 SRD
- **WHEN** 使用者於建角或升級流程檢視種族、背景、子職業、專長、法術選項
- **THEN** 僅列出 SRD 5.2 涵蓋的選項(種族 9、背景 4、每職業 1 子職)

### Requirement: 匯入管線的 SRD 過濾
內容庫匯入工具 SHALL 依上游 5etools 資料的 `srd52` 標記過濾:無標記的條目 SHALL 不匯入,有標記的條目 SHALL 將 `srd` 欄位標記為 true;確保任何後續重匯不會將非 SRD 內容寫回內容庫。

#### Scenario: 重匯不回灌非 SRD 內容
- **WHEN** 以匯入工具對任一資料域執行重匯
- **THEN** 匯入後該資料域不存在無 srd52 標記來源的資料列,且所有列 `srd = true`

### Requirement: Product Identity 名稱替代
含專有名的 SRD 內容(如 Bigby's、Tasha's、Mordenkainen's 系列法術)SHALL 使用 SRD 5.2 的官方改名(英文名與對應繁中定名),App 顯示與內容庫內文交叉引用 SHALL NOT 出現 Product Identity 原名。

#### Scenario: 改名法術以 SRD 名顯示
- **WHEN** 於法術目錄或角色法術清單檢視原 Bigby's Hand 對應之法術
- **THEN** 顯示 SRD 名稱(Arcane Hand 之繁中/英文定名),不出現「Bigby」等專有名

#### Scenario: 內文交叉引用無失效名稱
- **WHEN** 渲染任一 SRD 內容的描述文字(含 `{@spell …}` 等 tag)
- **THEN** 引用目標存在於內容庫且為 SRD 名稱;無指向已刪除或舊名條目的引用

### Requirement: CC-BY-4.0 授權聲明
App 與專案文件 SHALL 提供 SRD 5.2 的 CC-BY-4.0 attribution:README 與資料庫文件記載授權來源與條款,App 內提供可查看的授權聲明文字。

#### Scenario: App 內可查看授權聲明
- **WHEN** 使用者於 App 的關於/設定區開啟授權聲明
- **THEN** 顯示 SRD 5.2 之 CC-BY-4.0 attribution 文字

