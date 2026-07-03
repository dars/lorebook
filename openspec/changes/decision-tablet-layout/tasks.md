# Tasks: decision-tablet-layout

## 1. 級距基礎

- [x] 1.1 `ResponsiveLayout` 擴充：`expandedBreakpoint = 840`、選用 `expanded` 參數、`isExpanded()` 靜態查詢；既有 mobile/tablet 相容
- [x] 1.2 CLAUDE.md 版型適配原則更新為三段式（compact/medium/expanded）

## 2. Decision 頁排列

- [x] 2.1 `ActionsSection` 加 `showAction`/`showBonus`/`showReaction` 旗標（預設全開，行為不變）
- [x] 2.2 `DecisionPage` 三種排列：compact 現行、medium 置中限寬 600、expanded 三欄各自捲動（欄 1 狀態/資源/移動/休息、欄 2 動作、欄 3 附贈/反應/檢定）
- [x] 2.3 底部清空高度僅 compact 保留（rail 版無底部欄）

## 3. 驗證

- [x] 3.1 `flutter analyze` 零警告、`flutter test` 全過
- [x] 3.2 iPad 模擬器橫向：三欄排列如設計稿、各欄可捲動、HP/法術位互動正常
- [x] 3.3 iPad 模擬器直向：單欄置中限寬、NavigationRail 保留
- [x] 3.4 iPhone 模擬器：版面與現行完全一致（回歸）
