# Proposal: decision-tablet-layout

## Why

App 定位手機與平板共用一份 codebase，但 Decision（行動）頁目前只有單欄縱向排法：iPad 橫向 1194pt 寬的畫面浪費大量空間，跑團當下最需要「狀態、動作、反應一眼全見」的頁面反而要不斷捲動。設計稿（designs.pen「行動 iPad」）已定案三欄排列；同時「平板 = 600dp」的單一斷點與新決策「iPad 直向沿用手機排法」矛盾（iPad 直向 834pt 會被誤判進平板版型），需要引入三段式寬度級距。

## What Changes

- **三段式寬度級距**取代單一 600 斷點：compact（<600）／medium（600–840）／expanded（≥840），依 Material 3 window size class；`ResponsiveLayout` 擴充 `expanded` 支援與級距查詢，既有 mobile/tablet 用法向後相容
- **Decision 頁 expanded（iPad 橫向）三欄排列**（依 designs.pen mock）：欄 1 狀態/資源/移動/休息、欄 2 動作、欄 3 附贈動作/反應/檢定；各欄獨立捲動
- **Decision 頁 medium（iPad 直向）沿用手機單欄排法**，內容置中限寬避免卡片過寬
- `ActionsSection` 支援部分渲染（動作／附贈+反應 拆欄用），預設行為不變
- **CLAUDE.md 版型適配原則更新**為三段式（原文件寫「平板 ≥600dp」）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `decision`: 新增版型 requirement——Decision 頁依寬度級距切換單欄（compact/medium）與三欄（expanded）排列；medium 置中限寬
- `app-shell`: 導覽列行為明文化——compact 底部 Tab Bar、medium/expanded NavigationRail（現況既有行為，入規格）

## Impact

- **資料層**：無
- **程式碼**：`responsive_layout.dart`（級距）、`decision_page.dart`（三欄/限寬）、`actions_section.dart`（部分渲染參數）、`CLAUDE.md`
- **版型**：手機不變；iPad 直向單欄限寬、橫向三欄
- **相依**：無新套件
