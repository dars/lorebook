## MODIFIED Requirements

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

## ADDED Requirements

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
