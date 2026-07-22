# decision Delta

## MODIFIED Requirements

### Requirement: Action 動作區塊
Decision 頁面 SHALL 以**頂層「動作」區段**（與狀態/移動同階）呈現可執行項目，內部以清楚的三層階層組織：類別（攻擊 / 施法 / 其他）→ 施法子分層（戲法 / 各環）。類別可收合。所有可執行項目 SHALL 使用共用條目卡 `EntryCard`（見 app-shell 規格）。攻擊清單 SHALL 由裝備狀態推導：裝備中武器（物品欄 itemType=weapon 且 equipped）＋固定一列徒手攻擊（見 equipment-effects 規格），不再讀取靜態武器清單。

#### Scenario: 類別分組與排序
- **WHEN** 「動作」區段展開
- **THEN** 依序呈現類別：攻擊 → 施法 → 其他
- **THEN** 攻擊以 `EntryCard` 顯示裝備中武器與徒手攻擊（徽章「攻」、命中與傷害，傷害依類型上色）

#### Scenario: 裝備變更即時反映
- **WHEN** 玩家於物品頁裝備/卸下武器後回到行動頁
- **THEN** 攻擊清單即時反映最新裝備狀態（徒手攻擊恆在）

#### Scenario: 施法子分層（資料驅動、可收合）
- **WHEN** 角色為施法者且「施法」類別展開
- **THEN** 依序呈現子分層標頭：戲法 → 一環 → 二環 → …（環數遞增），各帶法術計數
- **THEN** 子分層**預設收合**（只顯示標頭 + 計數）；點標頭展開後以 `EntryCard` 顯示該層法術（戲法徽章「戲」、法術徽章為環數金色強調），點卡再展開描述
- **WHEN** 角色無戲法（如半施法者）
- **THEN** 略過「戲法」子分層，直接列各環
- **WHEN** 角色無施法能力（如野蠻人、基礎武僧）
- **THEN** 不顯示「施法」類別

#### Scenario: 類別可收合
- **WHEN** 使用者點類別標頭（攻擊/施法/其他）
- **THEN** 切換該類別收合/展開，收合時顯示項目計數
- **THEN** 預設：攻擊、施法展開，其他收合

#### Scenario: 其他動作
- **WHEN** 「其他」類別展開
- **THEN** 以 `EntryCard` 顯示：Dodge、Disengage、Help、Hide、Ready、Search、Use Object
- **THEN** 統一卡片樣式（不再與舊式卡片混用）
