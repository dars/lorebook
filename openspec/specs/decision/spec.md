# decision Specification

## Purpose
TBD - created by archiving change lorebook-initial-app-architecture. Update Purpose after archive.
## Requirements
### Requirement: Decision 為 App Home
Decision 頁面 SHALL 為 App 的預設首頁，為跑團當下最重要的畫面。

#### Scenario: 進入主畫面
- **WHEN** 使用者完成角色選擇進入主畫面
- **THEN** 預設顯示 Decision（行動）頁面

### Requirement: Status 狀態區塊
Decision 頁面 SHALL 將 HP（含臨時 HP）、AC、專注、異常狀態整合於**單一區塊**並以 divider 分隔，且可即時編輯當前角色的 HP、臨時 HP 與異常狀態。

#### Scenario: 區塊版面
- **WHEN** Status 區塊顯示
- **THEN** 以單一卡片呈現
- **THEN** 上半部為三欄並以 vertical divider 分隔：HP ｜ AC ｜ 專注
- **THEN** 三欄下方以 horizontal divider 分隔出狀態異常列
- **THEN** 狀態異常列左側標示「狀態異常・CONDITIONS」，右側顯示狀態 chip 或空狀態文字

#### Scenario: HP 顯示
- **WHEN** Status 區塊顯示
- **THEN** HP 欄顯示數值（當前/最大值）+ 血條
- **THEN** 血條依當前 HP 比例變色（健康/受傷/瀕死）
- **WHEN** 角色有臨時 HP（tempHp > 0）
- **THEN** 額外顯示臨時 HP 數值

#### Scenario: HP +/- 增減
- **WHEN** Status 區塊顯示
- **THEN** HP 欄下方提供 − / + 兩顆圓鈕
- **WHEN** 使用者單擊 −
- **THEN** 對角色造成 1 點傷害（扣血順序見「臨時 HP」需求）
- **WHEN** 使用者單擊 +
- **THEN** 治療 1 點當前 HP，且不超過最大值

#### Scenario: 瀕死強調
- **WHEN** 當前 HP 為 0
- **THEN** HP 區域以警示樣式強調

#### Scenario: AC 盾牌壓印
- **WHEN** Status 區塊顯示
- **THEN** AC 以盾牌壓印造型顯示數值

#### Scenario: 專注欄空狀態
- **WHEN** 角色未專注任何法術
- **THEN** 專注欄顯示空狀態且可點擊

#### Scenario: 專注中顯示
- **WHEN** 角色正在專注某項目
- **THEN** 專注欄顯示該項目名稱（含副標）

#### Scenario: 異常狀態顯示
- **WHEN** 角色有異常狀態（Conditions）
- **THEN** 以 chip 列出各異常狀態
- **WHEN** 無異常狀態
- **THEN** 顯示「目前無異常狀態」

### Requirement: Resources 資源區塊
Decision 頁面 SHALL 依職業動態顯示可用資源：法術位，以及通用的職業資源（次數型 / 數字池 / 骰子型）。

#### Scenario: 法術位
- **WHEN** 角色為施法者
- **THEN** 法術位以**金色 pip（點狀）**呈現，與離散型職業資源共用同一樣式
- **THEN** 依環數分列顯示（如 1環、2環）
- **THEN** 每列顯示剩餘/最大值

#### Scenario: 次數型職業資源
- **WHEN** 角色有次數型資源（pips，如狂暴、引導神力、契約位）
- **THEN** 以剩餘/最大的點狀顯示該資源名稱與數量

#### Scenario: 數字池職業資源
- **WHEN** 角色有數字池資源（number，如法術點數、聖療之觸）
- **THEN** 顯示「當前值 + 單位」（如 15 HP、5 點）
- **THEN** 左右各提供 +/- 圓鈕直接調整（夾 0~max）
- **THEN** 以小字標示最大值（上限）

#### Scenario: 骰子型職業資源
- **WHEN** 角色有骰子型資源（dice，如吟遊激勵）
- **THEN** 以 `1dN` 格式顯示骰面
- **THEN** 顯示剩餘次數，並以 +/- 調整（夾 0~max）

#### Scenario: 無職業資源
- **WHEN** 角色沒有任何非法術位職業資源
- **THEN** 不顯示職業資源段落

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
Decision 頁面 SHALL 提供長休與短休功能：長休需確認後完整恢復；短休以資訊型對話框告知可執行的事。

#### Scenario: 長休確認
- **WHEN** 使用者點擊長休
- **THEN** 顯示確認對話框
- **WHEN** 使用者取消
- **THEN** 不做任何恢復

#### Scenario: 長休完整恢復
- **WHEN** 使用者於確認對話框確認長休
- **THEN** HP 回滿、法術位回滿、職業資源回滿
- **THEN** 臨時 HP 清空
- **THEN** 力竭等級 −1（不低於 0）

#### Scenario: 短休對話框
- **WHEN** 使用者點擊短休
- **THEN** 跳出 bottom sheet
- **THEN** 顯示生命骰細節（依角色職業骰面與等級，如「3d6」）
- **WHEN** 角色具有奧術恢復特性
- **THEN** 以與法術相同的可展開卡呈現奧術恢復，點開顯示其敘述

#### Scenario: 完成短休
- **WHEN** 使用者於短休對話框點「完成短休」
- **THEN** 回滿「短休回復」的職業資源
- **THEN** 關閉對話框

### Requirement: 臨時 HP
臨時 HP SHALL 作為獨立於當前/最大 HP 的緩衝：受傷先扣臨時 HP、治療不回復臨時 HP、設定時不與既有臨時 HP 疊加、完成長休時清空。

#### Scenario: 顯示與入口
- **WHEN** Status 區塊顯示
- **THEN** HP 欄常駐一個盾牌符號作為臨時 HP 入口
- **WHEN** 臨時 HP 大於 0
- **THEN** 盾牌以藍色顯示臨時 HP 數值
- **WHEN** 臨時 HP 為 0
- **THEN** 盾牌以淡色、無數字呈現（仍可點擊）

#### Scenario: 開啟設定
- **WHEN** 使用者點擊 HP 欄的盾牌符號
- **THEN** 開啟臨時 HP 數值輸入

#### Scenario: 受傷先扣臨時 HP
- **WHEN** 對角色造成傷害
- **THEN** 先扣除臨時 HP，溢出部分再扣當前 HP
- **THEN** 當前 HP 不低於 0

#### Scenario: 治療不回復臨時 HP
- **WHEN** 對角色治療
- **THEN** 只增加當前 HP（不超過最大值）
- **THEN** 臨時 HP 維持不變

#### Scenario: 設定臨時 HP（不疊加）
- **WHEN** 使用者設定臨時 HP 數值
- **THEN** 以輸入值取代，不與既有臨時 HP 相加
- **THEN** 介面提示臨時 HP 不疊加

#### Scenario: 長休清空臨時 HP
- **WHEN** 角色完成長休
- **THEN** 臨時 HP 歸零

#### Scenario: 短休不影響臨時 HP
- **WHEN** 角色完成短休
- **THEN** 臨時 HP 維持不變（不清除、不回復）

### Requirement: 專注選擇與取消
專注欄 SHALL 透過底部彈出選單（bottom sheet）選擇需專注的項目，並可再次點擊以取消。

#### Scenario: 空狀態點擊開啟選單
- **WHEN** 專注欄為空狀態且使用者點擊
- **THEN** 彈出 bottom sheet，列出角色的法術/技能中需要專注的項目

#### Scenario: 選擇專注項目
- **WHEN** 使用者於 bottom sheet 點選某個需專注項目
- **THEN** 將其設為當前專注並關閉 bottom sheet
- **THEN** 專注欄顯示該項目

#### Scenario: 再次點擊確認取消
- **WHEN** 專注中且使用者點擊專注欄
- **THEN** 顯示確認是否取消專注
- **WHEN** 使用者確認
- **THEN** 清除當前專注，專注欄回到空狀態

#### Scenario: 無可專注項目
- **WHEN** 角色沒有任何需專注的法術/技能
- **THEN** bottom sheet 顯示空狀態提示

### Requirement: 異常狀態管理
Status 區塊 SHALL 透過底部彈出選單（bottom sheet）以勾選方式管理 D&D 5.5e 標準 15 種異常狀態。除「力竭 Exhaustion」外的狀態為二元（有/無、不疊加、不重複）；力竭 SHALL 以 1–6 級的累進等級表示。

#### Scenario: 開啟狀態選單
- **WHEN** 使用者點擊狀態異常列的入口
- **THEN** 彈出 bottom sheet，列出 15 種狀態
- **THEN** 每一列含 checkbox、中文名與一行簡短效果說明
- **THEN** 角色目前具有的狀態預先勾選

#### Scenario: 勾選新增 / 取消勾選移除
- **WHEN** 使用者勾選某個（非力竭）狀態
- **THEN** 該狀態加入並於主畫面以 chip 顯示
- **WHEN** 使用者取消勾選
- **THEN** 該狀態移除
- **THEN** 同一狀態不重複、不疊加

#### Scenario: 力竭以等級 stepper 調整
- **WHEN** 使用者於選單中調整力竭等級 stepper
- **THEN** 力竭等級設為 0~6（0 = 無）
- **THEN** 等級 ≥1 時於主畫面以 chip 顯示當前等級

#### Scenario: 快速移除 chip
- **WHEN** 使用者點主畫面某個狀態 chip 的移除
- **THEN** 該狀態自顯示中移除

#### Scenario: 查看狀態效果
- **WHEN** 使用者於選單檢視某狀態，或點主畫面 chip 本體
- **THEN** 顯示該狀態的效果說明（力竭顯示當前等級的效果）

#### Scenario: 不同狀態可並存
- **WHEN** 角色同時具有多個不同狀態
- **THEN** 各狀態各自以 chip 並列顯示

### Requirement: 職業資源消耗與回復
Resources 區塊 SHALL 允許消耗與回復職業資源，數值夾在 0 ~ 最大值之間。

#### Scenario: 消耗資源
- **WHEN** 使用者消耗某項資源
- **THEN** 該資源當前值 −1，且不低於 0

#### Scenario: 回復資源
- **WHEN** 使用者回復某項資源
- **THEN** 該資源當前值 +1，且不超過最大值

### Requirement: 休息回復職業資源
休息 SHALL 依資源的回復時機回滿對應職業資源。

#### Scenario: 短休回復短休資源
- **WHEN** 角色完成短休
- **THEN** 回復時機為「短休」的資源回滿至最大值
- **THEN** 回復時機為「長休」的資源不變

#### Scenario: 長休回復所有資源
- **WHEN** 角色完成長休
- **THEN** 所有職業資源回滿至最大值

