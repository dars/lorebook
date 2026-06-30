## Why

專案已累積一套自有元件庫（CollapsibleSection、EntryCard、ParchmentCard、六角屬性圖、各式卡片/chips…）與暗黑奇幻金色主題，且需同時適配手機與平板（≥600dp）。目前只能在完整 App 流程中檢視元件，難以**隔離開發、跨主題/裝置比對、回歸檢視**。導入 Widgetbook 建立元件型錄，提升設計一致性與開發效率。

## What Changes

- 導入 **Widgetbook（generated 整合）**：`widgetbook` + `widgetbook_annotation` + `widgetbook_generator`（build_runner，與既有 freezed 共用）。
- **獨立進入點** `lib/widgetbook.dart`（與正式 App 分離，不進產品 bundle）；以 `flutter run -t lib/widgetbook.dart` 啟動。
- **Addons**：主題（暗黑為主 + 亮色）、裝置框（手機 / 平板，對應 600dp breakpoint）、文字縮放。
- **以 `@UseCase` 標註**收錄四大類元件：
  - **共用**：CollapsibleSection、EntryCard、ParchmentCard、CompactStatRow、GoldPips、chips 等。
  - **建角**：六角屬性圖、能力卡、戰鬥數值卡、選擇 chips、方式切換。
  - **角色卡分頁**：屬性盾牌、技能列、法術/裝備 EntryCard、英雄卡。
  - **決策頁區段**：狀態 / 資源 / 移動 / 動作 / 檢定 / 休息等 section。
- build_runner 產生 `widgetbook.directories.g.dart` 收集所有 use-case。

## Impact

- **相依套件（dev）**：`widgetbook`、`widgetbook_annotation`、`widgetbook_generator`。
- **程式碼**：新增 `lib/widgetbook.dart` 與 use-case（公開元件可置於 `widgetbook/` 目錄；**部分 feature 內部為 private 的元件**（如六角圖、決策頁 section、建角內部卡片）需**提升為公開共用元件**或於原檔co-locate `@UseCase` 才能被收錄）。
- **能力**：新增 component-catalog（元件型錄）能力。
- **不影響產品**：獨立進入點，正式 App（`lib/main.dart`）與 bundle 不變；型錄為開發工具。
- **範圍界線**：不含 golden/螢幕截圖測試、Widgetbook Cloud / web 部署、100% 元件覆蓋——先建基礎設施 + 首批 use-case，其餘漸增。
