## Context

`rest-flow` 已建立短休 bottom sheet 與 `longRest()`；生命骰目前由 `rest_section.dart` 的 `_hitDieFaces(className)` 推導、僅顯示。本變更把生命骰變為可追蹤、可花用的資源，並讓長休回半。屬增量，不改既有休息流程結構。

## Goals / Non-Goals

**Goals:**
- 短休可**標記花用**生命骰並追蹤剩餘。
- 長休回復一半生命骰（D&D 規則）。

**Non-Goals:**
- **代擲骰子 / 自動回血**——本工具為記錄/追蹤，不擲骰；玩家自行擲並用 HP +/- 調整。
- 多重生命骰類別（多職業混合骰面）——本次單一 `hitDieFaces`，多職業後續。
- 一次選擇花多顆的批次 UI——本次一顆一顆花（足夠且單純）。
- 奧術恢復自動化、其他職業休息能力（其他後續項目）。

## Decisions

### 1. 資料模型：兩個欄位
`Character` 新增：
- `@Default(8) int hitDieFaces`（骰面；mock 設定，法師 6 / 野蠻人 12）。
- `@Default(0) int hitDiceUsed`（已花用數）。
- 衍生（getter 或就地計算）：`hitDiceTotal = level`、`hitDiceRemaining = level - hitDiceUsed`。
- 單一骰面足以涵蓋單職業；多職業後續再擴充為清單。

### 2. 標記花用：`useHitDie()`
`CurrentCharacterNotifier.useHitDie()`：
- 若 `hitDiceRemaining <= 0` → 不動作。
- 否則 `hitDiceUsed += 1`（純計數）。
- **不擲骰、不改 HP**：玩家自行擲 `d{faces}`＋體質，再用既有 HP +/- 調整。

### 3. 長休回半
`longRest()` 既有恢復外加：`regain = max(1, level ~/ 2)`；`hitDiceUsed = (hitDiceUsed - regain).clamp(0, level)`。

### 4. 短休 UI（標記花用）
短休 bottom sheet 的生命骰列改為：
- 顯示「生命骰　d{faces}・剩餘 {remaining}/{total}」（d{faces} 讓玩家知道要擲什麼）。
- 「花 1 顆」按鈕：呼叫 `useHitDie()`（剩餘 −1）。
- 剩餘為 0 → 按鈕顯示「已用盡」並停用。
- sheet 內容以 `Consumer` watch 當前角色，花用後即時更新剩餘。改讀 `character.hitDieFaces`。

## Risks / Trade-offs

- **[骰面改為資料欄位]** → 原 `_hitDieFaces(className)` 移除，改讀 `character.hitDieFaces`。
- **[一顆一顆花]** → 高等角色要花多顆較繁瑣；可後續加「花 N 顆」批次。
- **[不代擲]** → 玩家需自行擲骰並調 HP；符合本工具定位（記錄而非擲骰器）。
