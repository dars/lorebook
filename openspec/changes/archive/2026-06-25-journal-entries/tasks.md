## 1. 資料模型

- [x] 1.1 新增 `JournalEntry`（freezed：id、title、body、createdAt、updatedAt）
- [x] 1.2 `Character` 新增 `@Default(<JournalEntry>[]) List<JournalEntry> journalEntries`
- [x] 1.3 mock：補幾筆示意日誌（至少法師戴夫林）；執行 `build_runner`

## 2. 狀態方法

- [x] 2.1 `addJournalEntry(title, body)`：建立條目（id = 時間戳、createdAt/updatedAt = now）加入清單
- [x] 2.2 `updateJournalEntry(id, title, body)`：更新內容並設 `updatedAt = now`
- [x] 2.3 `removeJournalEntry(id)`：移除條目

## 3. UI

- [x] 3.1 `JournalPage`：依 `updatedAt` 新到舊列出條目卡（標題、日期、內文摘要）；底部留白足夠
- [x] 3.2 右下角浮動新增按鈕（Stack + Positioned，bottom = `bottomNavClearance + 8`，浮於底欄之上）；空狀態仍可用 FAB 新增
- [x] 3.3 新增 `JournalEditorPage`（可選 entry）：全螢幕、單一多行輸入框（第一行＝標題）、頂端日期、AppBar 右側儲存（編輯時另刪除）
- [x] 3.4 儲存以第一行為標題其餘為內文，呼叫 add/update 返回；刪除確認後 `removeJournalEntry` 返回
- [x] 3.5 列表點條目 / 點 FAB → 以 root navigator 全螢幕推入編輯頁（編輯 / 新增）

## 4. 驗證

- [x] 4.1 `flutter analyze` 無錯誤
- [x] 4.2 實機驗證：新增/編輯/刪除條目、列表排序與空狀態
- [x] 4.3 實機驗證：切換角色顯示各自日誌
- [x] 4.4 驗證手機與平板版型呈現正常
