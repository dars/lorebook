> **狀態：backlog（草稿）** — 先記錄待辦範圍，待實際要做時再補完 design / specs / tasks 並 `/opsx:propose` 細化。

## Why

行動頁的「休息」目前幾乎只是按鈕：`enhance-decision-status` 讓長休清空臨時 HP、`class-resources` 讓長/短休回復職業資源，但**完整的休息動作流程尚未實作**——生命骰、奧術恢復、長休完整恢復 HP/法術位、力竭遞減等。需要一個 change 把休息流程做完整。

## What Changes（待辦）

- **短休流程（點短休 → 跳「行動選單」對話框）**
  - 對話框列出可於短休執行的動作（依職業動態顯示）：
    - **擲生命骰 Hit Dice**：選擇花幾顆、擲骰回復 HP（顯示剩餘/最大）
    - **奧術恢復 Arcane Recovery**（法師，1/天）：回補總環數 ≤ 角色等級一半的法術位（≤5 環）
    - 其他「休息時才使用」的職業能力
    - 「回復短休資源」（已於 class-resources 做 `shortRest()`，此處整合進對話框）
- **長休流程（點長休 → 先確認對話框，避免誤觸）**
  - 確認後完整恢復：HP 回滿、法術位回滿、職業資源回滿、臨時 HP 清空（部分已於前述 change 完成）
  - 生命骰回復一半（D&D 規則）
  - 力竭等級 −1（2024 長休遞減）
- **資料模型**：`Character` 可能新增 `hitDice`（當前/最大、骰面）等欄位

## Capabilities

### Modified Capabilities
- `decision`: 將「休息功能」需求從按鈕擴充為完整短休/長休流程（生命骰、奧術恢復、各職業休息能力、長休完整恢復與力竭遞減）

## Impact

- **程式碼**：`features/decision/presentation/sections/rest_section.dart` 為主；可變角色狀態 Notifier 新增休息相關方法（花生命骰、奧術恢復、力竭遞減…）
- **資料層**：`Character` 可能新增生命骰欄位（freezed）；沿用本機可變狀態，Supabase 持久化後續
- **相依**：建立在 `enhance-decision-status`（長休清臨時 HP）與 `class-resources`（休息回復職業資源）之上
- **靜態資料**：各職業「休息才用」能力的完整清單屬靜態遊戲資料、後續

## 來源

此 backlog 由 `class-resources` 討論時界定：Resources 只收「遊玩當下消耗」的資源；**「休息時才使用」的能力（奧術恢復、生命骰 Hit Dice…）改由本 change 處理**。
