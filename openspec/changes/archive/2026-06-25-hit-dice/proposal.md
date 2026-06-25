## Why

`rest-flow` 簡單版把生命骰（Hit Dice）做成**純資訊**——短休只顯示「3d6」，不能擲、不能花；長休也不回復生命骰。但生命骰是 D&D 短休回血的核心機制，跑團時會想實際花用。本變更補上：

- **短休花用生命骰追蹤**（rest-flow 後續 #1；標記使用，不代擲）
- **長休回復一半生命骰**（rest-flow 後續 #2）

## What Changes

- **資料模型**：`Character` 新增生命骰追蹤——`hitDieFaces`（骰面，依職業）與 `hitDiceUsed`（已花用數）；總數 = 角色等級、剩餘 = 等級 − 已用。
- **短休標記花用生命骰**：短休 bottom sheet 的生命骰由「資訊」改為**可標記花用**——顯示剩餘/總數、可花 1 顆（剩餘 −1）。**App 不擲骰、不自動改 HP**（本工具為記錄/追蹤，非擲骰器）；玩家自行擲 `d{faces}`＋體質並用既有 HP +/- 調整。剩餘 0 時停用。
- **長休回半**：`longRest()` 額外回復「總數一半（最少 1）」的生命骰（`hitDiceUsed` 相應減少）。
- **mock**：兩個角色設定 `hitDieFaces`（法師 d6、野蠻人 d12）與初始 `hitDiceUsed`。

## Impact

- **資料層**：`features/character/domain/character.dart`（新增兩欄位、mock 設值）→ 跑 `build_runner` 重生 freezed。
- **狀態**：`character_providers.dart` 新增 `useHitDie()`（標記花用、剩餘 −1）、`longRest()` 加回半生命骰。
- **UI**：`features/decision/presentation/sections/rest_section.dart` 短休生命骰區改為可標記花用。
- **能力**：decision「休息功能」——短休生命骰可標記花用、長休回半。
- **相依套件**：不新增。
