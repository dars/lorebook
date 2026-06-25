## ADDED Requirements

### Requirement: 頂層區段可收合
Decision 頁面的**所有頂層區段**（狀態、資源、移動、動作、附贈動作、反應、檢定、休息）SHALL 可收合，使用共用的可收合標題（樣式對齊 `SectionTitle`，加上 chevron）。

#### Scenario: 切換頂層區段
- **WHEN** 使用者點某頂層區段標題
- **THEN** 切換該區段的收合/展開
- **THEN** 標題顯示 chevron 表示狀態（展開 `⌄` / 收合 `›`）

#### Scenario: 收合摘要（選用）
- **WHEN** 動作 / 附贈動作 / 反應 區段收合
- **THEN** 標題列顯示內容摘要（如動作「攻擊・施法・其他」、反應「護盾術・機會攻擊」）

#### Scenario: 頂層順序
- **WHEN** Decision 頁面顯示
- **THEN** 頂層區段依序為：狀態 → 資源 → 移動 → 動作 → 附贈動作 → 反應 → 檢定 → 休息

## MODIFIED Requirements

### Requirement: Action 動作區塊
Decision 頁面 SHALL 以**頂層「動作」區段**（與狀態/移動同階）呈現可執行項目，內部以清楚的三層階層組織：類別（攻擊 / 施法 / 其他）→ 施法子分層（戲法 / 各環）。類別可收合。所有可執行項目 SHALL 使用共用條目卡 `EntryCard`（見 app-shell 規格）。

#### Scenario: 類別分組與排序
- **WHEN** 「動作」區段展開
- **THEN** 依序呈現類別：攻擊 → 施法 → 其他
- **THEN** 攻擊以 `EntryCard` 顯示武器（徽章「攻」、命中與傷害，傷害依類型上色）

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

### Requirement: Bonus Action 附贈動作區塊
附贈動作 SHALL 為**頂層區段**（與動作/反應同階，可收合）。

#### Scenario: 有可用附贈動作
- **WHEN** 角色有可用的附贈動作（如附贈施法、職業附贈能力）
- **THEN** 以 `EntryCard` 顯示列表（情境徽章如「贈」）

#### Scenario: 無可用附贈動作
- **WHEN** 角色無可用附贈動作
- **THEN** 顯示「無附贈動作」

### Requirement: Reaction 反應區塊
反應 SHALL 為**頂層區段**（與動作/附贈同階，可收合）。

#### Scenario: 有可用反應
- **WHEN** 角色有可用的反應（如 Shield 護盾術、Opportunity Attack）
- **THEN** 以 `EntryCard` 顯示列表（情境徽章如「盾」「攻」）

#### Scenario: 無可用反應
- **WHEN** 角色無可用反應
- **THEN** 顯示「無可用反應」
