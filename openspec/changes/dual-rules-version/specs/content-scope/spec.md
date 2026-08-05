## MODIFIED Requirements

### Requirement: 內容範圍政策(SRD 5.2 + 使用者自訂)
App 的規則內容 SHALL 以 D&D 2024(5r)或 D&D 2014(5e)規則為基準,且 SHALL 僅來自 SRD 5.2(CC-BY-4.0)、SRD 5.1(CC-BY-4.0)或使用者自訂資料;App SHALL NOT 收錄或顯示怪物、官方劇本/劇情內容,以及任何非 SRD 的官方出版內容。每個角色的規則版本決定其可見的內容範圍,SHALL NOT 跨版混用。此政策 SHALL 明文記載於 CLAUDE.md、README 與 `openspec/config.yaml` 專案 context。玩家自產內容(角色卡、個人筆記、Campaign 共用筆記)不受此限制——政策排除的是官方出版內容,非使用者內容。

#### Scenario: 內容庫僅含 SRD 資料列
- **WHEN** 檢視內容庫任一內容表(spells/classes/subclasses/races/backgrounds/feats/conditions/optionalfeatures/entries)
- **THEN** 不存在任何非 SRD 的資料列(`XPHB` 列須有 srd52 標記來源、`PHB` 列須有 srd 標記來源,其餘不匯入)

#### Scenario: 各資料域筆數與 SRD 覆蓋一致
- **WHEN** 依書源查詢各內容表筆數
- **THEN** `XPHB` 與 SRD 5.2 覆蓋數一致:spells 339、classes 12、subclasses 12、backgrounds 4、feats 17、races 9、conditions 15、optionalfeatures 29
- **THEN** `PHB` 與 SRD 5.1 覆蓋數一致:spells 319、classes 12、subclasses 12、backgrounds 1、feats 1、races 9(含 SRD 亞種 6)、conditions 15、optionalfeatures 49、items 186 + baseitems 63

#### Scenario: 建角與升級選項限於 SRD
- **WHEN** 使用者於建角或升級流程檢視種族、背景、子職業、專長、法術選項
- **THEN** 僅列出該角色規則版本對應 SRD 涵蓋的選項,不出現另一版本的內容

### Requirement: 匯入管線的 SRD 過濾
內容庫匯入工具 SHALL 依目標規則版本切換上游 5etools 資料的 SRD 標記過濾:匯入 `XPHB` 依 `srd52` 標記、匯入 `PHB` 依 `srd`(SRD 5.1)標記;無對應標記的條目 SHALL 不匯入,有標記的條目 SHALL 將 `srd` 欄位標記為 true;確保任何後續重匯不會將非 SRD 內容寫回內容庫,且重匯其一 SHALL NOT 影響另一書源的資料列。

#### Scenario: 重匯不回灌非 SRD 內容
- **WHEN** 以匯入工具對任一資料域、任一書源執行重匯
- **THEN** 匯入後該資料域不存在無對應 SRD 標記來源的資料列,且所有列 `srd = true`

#### Scenario: 重匯不影響另一書源
- **WHEN** 以匯入工具重匯 `PHB` 的 spells 資料域
- **THEN** `XPHB` 的 spells 資料列不受影響

### Requirement: CC-BY-4.0 授權聲明
App 與專案文件 SHALL 提供所收錄 SRD 的 CC-BY-4.0 attribution:README 與資料庫文件記載 SRD 5.2 與 SRD 5.1 兩份授權來源與條款,App 內提供可查看的授權聲明文字,兩份 attribution 皆須呈現。

#### Scenario: App 內可查看授權聲明
- **WHEN** 使用者於 App 的關於/設定區開啟授權聲明
- **THEN** 顯示 SRD 5.2 與 SRD 5.1 之 CC-BY-4.0 attribution 文字
