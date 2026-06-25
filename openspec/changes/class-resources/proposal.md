## Why

行動頁的 Resources 區塊目前只顯示法術位，但 D&D 各職業還有多種**非法術位資源**——狂暴、氣/專注點、法術點數、契約位（短休回復）、引導神力、野性塑形、吟遊激勵、聖療之觸 HP 池等。要讓「Resources 依職業動態顯示」名副其實，需要一個通用的職業資源模型與追蹤機制。

## What Changes

- 新增通用「職業資源」資料模型：名稱、當前/最大、回復時機（短休 / 長休 / 不自動）、呈現樣式（次數點、數字池、骰子型）。
- Resources 區塊在法術位下方**依角色資源動態顯示**各職業資源；角色無此類資源時不顯示。
- 資源可**消耗 / 回復**（點擊互動）。
- **法術位視覺統一**：由現行綠色水晶改為**金色 pip（點狀）**，與離散型職業資源共用同一套 pip 樣式，讓 Resources 區塊視覺語言一致（離散＝金 pip、池＝數字、骰子＝1dN）。
- 與休息連動：**短休**回復「短休資源」（如氣、契約位）、**長休**回復全部資源。
- **範圍界線**：Resources 只收「遊玩當下會即時消耗」的資源。排除：**休息時才使用的能力**（奧術恢復、生命骰 Hit Dice 等）→ rest 流程；**1/天 施放型能力**（祕法奧義 Mystic Arcanum）→ 行動頁施法清單（標 1/天）。皆為後續。
- 本階段以 mock 呈現代表性資源；法師除法術位外無遊玩消耗的職業資源；**完整 per-class 資源規則屬靜態遊戲資料，列為後續**。

## Capabilities

### New Capabilities
<!-- 無新增 capability -->

### Modified Capabilities
- `decision`: Resources 區塊由「僅法術位」擴充為「法術位 + 通用職業資源動態顯示」，含資源消耗/回復與休息連動。

## Impact

- **資料層（角色卡資料）**：`Character` 新增 `resources` 欄位（職業資源清單，freezed，需 `build_runner`）。沿用 `enhance-decision-status` 既有的可變角色狀態 `Notifier`（本機編輯），**Supabase 持久化留待後續**、不涉及 Realtime、不新增資料表。
- **靜態資料**：各職業（**含子職業**）實際擁有哪些資源、數值與回復規則屬靜態遊戲資料，本階段僅以 mock 呈現，不連雲端、不新增第三方套件。
- **程式碼**：`features/decision/presentation/sections/resources_section.dart` 為主；新增共用金色 pip widget（取代法術位的綠水晶 `crystal_slot`）；notifier 新增資源相關方法；rest 流程（`rest_section.dart`）接上短休/長休回復。
- **版型**：手機與平板皆受影響，沿用同一份 widget。
- **相依套件**：不新增第三方套件。
