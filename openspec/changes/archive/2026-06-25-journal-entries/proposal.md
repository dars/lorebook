## Why

「旅程」分頁目前只是骨架——一個標題加空狀態文字，沒有資料模型、無法新增筆記。冒險日誌是核心輔助功能之一，需要能實際記錄與管理跑團筆記。

## What Changes

- **資料模型**：新增 `JournalEntry`（freezed：id、title、body、createdAt、updatedAt）。
- **歸屬角色**：日誌掛在 `Character.journalEntries`，**跟著當前角色**（切換角色即換成該角色的日誌，沿用既有 switch 機制）。
- **條目列表**：Journal 頁以卡片列出日誌（標題、日期、內文摘要），**依更新時間新到舊**排序；無條目時顯示空狀態。**右下角浮動新增按鈕（FAB）**。
- **筆記式編輯畫面**：點 FAB（新增）或條目卡（編輯）開啟全螢幕編輯——**第一行為標題、下方自由輸入內文**；**頂端顯示新增/編輯日期**；**右上角儲存／刪除**。
- **mock**：補幾筆示意日誌以利瀏覽。

## Impact

- **資料層**：`features/character/domain/character.dart`（新增 `JournalEntry` 與 `Character.journalEntries`、mock 設值）→ 跑 `build_runner`。
- **狀態**：`character_providers.dart` 新增 `addJournalEntry` / `updateJournalEntry` / `removeJournalEntry`。
- **UI**：`features/journal/presentation/journal_page.dart` 改為條目列表 + 新增入口；新增 `journal_editor_page.dart`（標題/內文編輯）。
- **能力**：journal「Journal 頁面骨架」擴充為條目列表 + CRUD。
- **範圍界線**：分類（冒險日誌/世界觀筆記）、搜尋/篩選 → 後續；跨 session 持久化與 Supabase → 後續（本階段記憶體 mock）。
- **相依套件**：不新增（id 以時間戳生成）。
