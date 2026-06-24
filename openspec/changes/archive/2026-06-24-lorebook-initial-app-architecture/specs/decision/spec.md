## ADDED Requirements

### Requirement: Decision 為 App Home
Decision 頁面 SHALL 為 App 的預設首頁，為跑團當下最重要的畫面。

#### Scenario: 進入主畫面
- **WHEN** 使用者完成角色選擇進入主畫面
- **THEN** 預設顯示 Decision（行動）頁面

### Requirement: Status 狀態區塊
Decision 頁面 SHALL 顯示 HP、AC、專注、異常狀態。

#### Scenario: HP 顯示與調整
- **WHEN** Status 區塊顯示
- **THEN** 顯示 HP 數值（當前/最大值）+ 血條
- **THEN** 提供 +/- 按鈕調整當前 HP

#### Scenario: AC 盾牌壓印
- **WHEN** Status 區塊顯示
- **THEN** AC 以盾牌壓印造型顯示數值

#### Scenario: 專注顯示
- **WHEN** 角色正在專注某法術
- **THEN** 顯示施法中的法術名稱
- **THEN** 提供「點按結束」的操作

#### Scenario: 無專注
- **WHEN** 角色未專注任何法術
- **THEN** 專注區域顯示「無」或隱藏

#### Scenario: 異常狀態
- **WHEN** 角色有異常狀態（Conditions）
- **THEN** 顯示異常狀態列表
- **WHEN** 無異常狀態
- **THEN** 顯示「目前無異常狀態」

### Requirement: Resources 資源區塊
Decision 頁面 SHALL 依職業動態顯示可用資源。

#### Scenario: 法術位
- **WHEN** 角色為施法者
- **THEN** 法術位以水晶造型呈現
- **THEN** 依環數分列顯示（如 1環、2環）
- **THEN** 每列顯示剩餘/最大值

#### Scenario: 其他職業資源
- **WHEN** 角色職業有其他資源（如氣點、吟遊激勵等）
- **THEN** 動態顯示對應資源與剩餘次數

### Requirement: Movement 移動區塊
Decision 頁面 SHALL 顯示移動相關數值。

#### Scenario: 速度與衝刺
- **WHEN** Movement 區塊顯示
- **THEN** 顯示速度（ft + 格數換算）
- **THEN** 顯示衝刺（ft + 格數換算）

### Requirement: Action 動作區塊
Decision 頁面 SHALL 以可收合清單顯示所有可用動作。武器與法術 SHALL 使用與 Character 頁面一致的共用條目卡 `EntryCard`（見 app-shell 規格），點按可展開描述。

#### Scenario: 攻擊清單
- **WHEN** 攻擊區塊顯示
- **THEN** 以 `EntryCard` 顯示武器列表（徽章「攻」）
- **THEN** 每個武器顯示中英文名、命中加值、傷害骰；傷害數值依傷害類型上色
- **WHEN** 使用者點按武器卡
- **THEN** 展開顯示武器屬性描述

#### Scenario: 施法·戲法
- **WHEN** 施法區塊顯示
- **THEN** 以 `EntryCard` 顯示可用戲法清單（徽章「戲」），點按可展開法術描述

#### Scenario: 法術（依環數）
- **WHEN** 法術區塊顯示
- **THEN** 依環數分類，以 `EntryCard` 顯示已備法術（徽章為環數、金色強調），點按可展開描述與升級/升環效應

#### Scenario: 附贈/反應法術沿用同一條目卡
- **WHEN** Bonus Action 或 Reaction 區塊顯示法術
- **THEN** 沿用同一個 `EntryCard`，僅徽章替換為情境字（如「贈」「盾」）

#### Scenario: 其他動作
- **WHEN** 使用者展開其他動作
- **THEN** 顯示：Dodge、Disengage、Help、Hide、Ready、Search、Use Object

### Requirement: Bonus Action 附贈動作區塊
Decision 頁面 SHALL 顯示當前可用的附贈動作。

#### Scenario: 有可用附贈動作
- **WHEN** 角色有可用的附贈動作（如 Bladesong）
- **THEN** 顯示附贈動作列表

#### Scenario: 無可用附贈動作
- **WHEN** 角色無可用附贈動作
- **THEN** 顯示「無可用附贈動作」

### Requirement: Reaction 反應區塊
Decision 頁面 SHALL 顯示當前可用的反應。

#### Scenario: 有可用反應
- **WHEN** 角色有可用的反應（如 Shield 護盾術、Opportunity Attack）
- **THEN** 顯示反應列表

#### Scenario: 無可用反應
- **WHEN** 角色無可用反應
- **THEN** 顯示「無可用反應」

### Requirement: Checks 檢定區塊
Decision 頁面 SHALL 提供能力檢定、豁免骰、技能檢定的修正值查詢，採「分頁（能力/豁免/技能）+ 點選項目 → 上方加值橫幅」的互動。

#### Scenario: 預設空白
- **WHEN** 進入 Checks 區塊且尚未點選任何項目
- **THEN** 上方加值橫幅顯示空白提示（如「點選下方項目，計算 1d20 加值」），不顯示修正值

#### Scenario: 點選顯示修正值
- **WHEN** 使用者點選某個能力/豁免/技能項目
- **THEN** 上方橫幅顯示該項目名稱（中文・英文）與修正值（+N）
- **THEN** 被點選的項目以強調樣式標示
- **THEN** 玩家自行加上骰面結果

#### Scenario: 再次點選取消
- **WHEN** 使用者再次點選同一個已選項目
- **THEN** 取消選取，橫幅回到空白提示

#### Scenario: 切換分頁清除選取
- **WHEN** 使用者切換 能力/豁免/技能 分頁
- **THEN** 清除目前選取，橫幅回到空白提示

### Requirement: 休息功能
Decision 頁面 SHALL 提供長休與短休功能。

#### Scenario: 長休
- **WHEN** 使用者點擊長休
- **THEN** 自動恢復法術位、HP 等資源至最大值

#### Scenario: 短休
- **WHEN** 使用者點擊短休
- **THEN** 跳出視窗顯示可執行的動作
- **THEN** 包含：投擲生命骰（如 3×1D6+1）、奧術恢復等依職業動態顯示的選項
