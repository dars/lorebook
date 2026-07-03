# Design: decision-tablet-layout

## Context

`ResponsiveLayout`（`shared/presentation/`）現為單一 600 斷點的 mobile/tablet 二分；`AppScaffold` 已依它在 ≥600 切 NavigationRail（現況保留）。Decision 頁為六個 section 的單欄 `SingleChildScrollView`；`ActionsSection` 一個 widget 內含動作/附贈/反應三個頂層 CollapsibleSection。設計稿：designs.pen「行動 iPad」（1194×834 三欄）。

## Goals / Non-Goals

**Goals:**
- 寬度級距三段式，語意對齊 Material 3（compact/medium/expanded）
- Decision 頁 expanded 三欄、medium 單欄限寬、compact 不變
- 排列與內容分離：三欄只是重新分配既有 section，不複製任何 section 實作

**Non-Goals:**
- 其他頁（角色/旅程/設定）的 expanded 版型（medium 置中限寬已足夠，另案）
- NavigationRail 樣式向設計稿靠攏（浮動膠囊樣式）——沿用現行 Material NavigationRail，視覺打磨另案
- 平板專屬互動（拖放、雙欄 master-detail）

## Decisions

### D1. 級距放在 ResponsiveLayout 上擴充，不另建 helper
`ResponsiveLayout` 加 `expandedBreakpoint = 840`、選用參數 `expanded`、`isExpanded(context)` 查詢。選 840 而非 900：對齊 Material 3 expanded 下緣，且 iPad 直向（834）恰落在 medium。既有 `mobile`/`tablet` 呼叫點不動（tablet 語意變為「≥600 的 fallback」，`expanded` 未提供時 ≥840 仍走 tablet）。

### D2. Decision 頁以「排列層」切換，section 原封不動
`DecisionPage.build` 依級距回傳三種排列：
- compact：現行單欄（不動）
- medium：同單欄，外包 `Center + ConstrainedBox(maxWidth: 600)`
- expanded：`Row` 三欄各自 `SingleChildScrollView`——欄 1〔Status、Resources、Movement、Rest〕、欄 2〔Actions（僅動作）〕、欄 3〔Actions（僅附贈+反應）、Checks〕
資料/狀態全在 section 內的 provider，排列層零狀態。

### D3. ActionsSection 部分渲染參數
`ActionsSection({bool showAction = true, bool showBonus = true, bool showReaction = true})`，於 build 內按旗標輸出對應 CollapsibleSection。預設全開 = 現行為；欄 2/欄 3 各自實例化。收合狀態為 widget 內部 state，兩實例互不干擾（可接受——不同欄的收合本就獨立）。
**捨棄方案**：拆成三個獨立 widget——動作/施法共用的 `_category`/`_ringGroup` helper 會被迫上移或重複，改動面大於一個旗標。

### D4. 底部清空高度只在 compact 需要
`bottomNavClearance` 是為懸浮 Tab Bar 預留；medium/expanded 用 NavigationRail 無底部欄，單欄尾端 SizedBox 改為 compact 才加（medium 用一般 padding）。

## Risks / Trade-offs

- [三欄在 expanded 下限（840–1000）可能偏擠] → 欄寬 fill 均分，CollapsibleSection 內容本就窄版設計；實測 iPad 11" 橫向（1194）為主要目標，13"（1366）更寬鬆
- [兩個 ActionsSection 實例各自 watch currentCharacterProvider] → 重複 rebuild 成本極低（同一 provider）
- [medium 限寬 600 與 AppScaffold rail 並存的視覺] → 內容置中，與選擇頁既有 maxWidth 慣例一致

## Open Questions

- 無
