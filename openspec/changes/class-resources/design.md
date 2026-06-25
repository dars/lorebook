## Context

`enhance-decision-status` 已將當前角色改為可變的 `CurrentCharacterNotifier`（HP/狀態/專注…可編輯），並已有 Resources 區塊以水晶造型顯示**法術位**（`resources_section.dart`）。但「其他職業資源」尚未建模。本次新增通用職業資源模型，讓 Resources 區塊能依角色動態顯示並追蹤狂暴、氣、法術點數、契約位等。本階段以 mock 運作。

## Goals / Non-Goals

**Goals:**
- 通用職業資源模型，可表達「次數、數字池、骰子型」三種常見資源
- Resources 區塊在法術位下方動態顯示，無資源則不顯示
- 資源可消耗 / 回復；短休回復短休資源、長休回復全部
- 沿用既有可變角色狀態 Notifier；手機平板共用 widget

**Non-Goals:**
- 完整 per-class 資源規則與數值（**含子職業**，屬靜態遊戲資料，後續）
- **休息時才使用的能力**（奧術恢復 Arcane Recovery、生命骰 Hit Dice 等）不屬 Resources；它們是「休息階段觸發」而非「遊玩當下消耗」，改由 rest 流程處理（後續變更）。Resources 只收「遊玩當下會即時消耗」的資源
- **「1/天 施放型」能力**（如祕法奧義 Mystic Arcanum）不屬 Resources；它本質是「施放特定法術」，歸**行動頁的施法清單**（標籤「1/天」、施放後變灰至長休），後續處理
- **進行中的持續效果 / buff**（如「狂暴中」「專注中」「祝福 Bless」等的剩餘回合/時間）不在此 change：Resources 只追蹤資源「數量」，而非「某效果正在生效」。持續效果屬未來的 active effects / buff 追蹤功能
- Supabase 持久化、跨裝置同步、Realtime
- 自動套用資源效果（如花氣點觸發某能力）；本次僅追蹤數量
- 法術位本身的呈現改動（沿用現狀）

## Decisions

### 1. 職業資源資料模型 `ClassResource`
```
class ClassResource {
  String name;        // 中文名，如「狂暴」「氣」「法術點數」「契約位」
  String nameEn;
  int current;
  int max;
  ResourceRecovery recovery; // short | long | none
  ResourceDisplay display;   // pips | number | dice
  int dieFaces;       // display==dice 時的骰面（如吟遊激勵 d8 → 8）
  String unit;        // display==number 時的單位（如「HP」「點」；可空）
}
enum ResourceRecovery { short, long, none }
enum ResourceDisplay { pips, number, dice }
```
- 以 freezed 定義；`Character` 新增 `@Default(<ClassResource>[]) List<ClassResource> resources`。
- **理由**：用單一通用模型涵蓋多職業，避免為每種資源寫死；之後接靜態資料時只是填充此清單。

### 2. 呈現樣式（依 `display`）
- **pips（次數型）**：狂暴、引導神力、野性塑形、契約位 → 以**金色圓點**顯示剩餘/最大。
  - **共用 pip widget**：建立單一金色 pip 元件，**法術位與離散職業資源共用**；法術位由現行綠色水晶（`crystal_slot`）改為此金 pip，使 Resources 區塊視覺一致。點一格切換消耗/回復。
- **number（數字池）**：法術點數、氣、聖療之觸 HP → 顯示 `當前值 + 單位`（如「15 HP」「5 點」），左右各一顆 +/- 圓鈕直接調整（夾 0~max）；最大值以小字（如「上限 15」）標示。
- **dice（骰子型）**：吟遊激勵 → 顯示骰面 + 次數，格式 `1d{faces} × [−] 次數 [+]`，次數以 +/- 調整（夾 0~max）。骰面以 `dieFaces` 表示、次數用 `current/max`。
- 骰子表示法全 app 統一為 **`NdX`（小寫 d）** 資料格式（如 `1d8`、`3d6`、`1d4+1`）；Cinzel 字體會以碑文大寫風呈現，視覺與既有傷害顯示一致。

### 3. 互動：消耗 / 回復
- notifier 方法：`spendResource(name)`（current−1，≥0）、`restoreResource(name)`（current+1，≤max）、`resetResource(name)`（current=max）。
- pips 點一格切換消耗（對齊法術位互動）；number/dice 提供 +/−。

### 4. 休息連動
- notifier `shortRest()`：將 `recovery == short` 的資源回滿（`current = max`）。
- notifier `longRest()`：所有資源回滿 + `clearTempHp()`（沿用 `enhance-decision-status`）；HP / 法術位完整恢復屬既有 rest 範疇。
- 在 `rest_section.dart` 的短休 / 長休按鈕接上對應方法。

### 5. Resources 區塊動態渲染
- `resources_section.dart`：法術位（現狀）之後，若 `character.resources` 非空，逐項依 `display` 渲染；空則不顯示該段。

### 6. mock 資料
- 戴夫林（法師）除法術位外**無遊玩當下消耗的職業資源**，故 `resources` 為空（奧術恢復屬休息能力、不放此處）。apply 時可暫放 1~2 筆示意資料以驗證 pips/number/dice 各型態；其餘職業資源待靜態資料導入後填充。

## Risks / Trade-offs

- **[資源樣式多樣]** → 先支援 pips / number / dice 三型涵蓋主流；特殊資源（如疊層、條件式）後續再擴充。
- **[per-class 規則缺口]** → 本次只做「通用容器 + 追蹤」，實際各職業有哪些資源由後續靜態資料決定；mock 先示意。
- **[休息回復與規則差異]** → 短休/長休一律「回滿對應資源」；個別資源的特殊回復量（如戰士招式骰）後續再精修。
- **[休息能力的歸屬]** → 奧術恢復、生命骰等「休息才用」的能力刻意排除於 Resources，留待 rest 流程處理；避免把「消耗型資源」與「休息動作」混在同一區。
