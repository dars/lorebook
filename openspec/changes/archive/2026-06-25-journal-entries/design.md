## Context

`journal_page.dart` 現為靜態空殼。資料層採記憶體 mock（沿用 `Character` + `currentCharacterProvider` 模式）；日誌歸屬角色，故掛在 `Character` 上，切換角色自然跟著換（switch-character 已備）。本變更新增模型、狀態方法與兩個畫面（列表、編輯）。

## Goals / Non-Goals

**Goals:**
- 每角色的日誌條目可瀏覽、新增、編輯、刪除。
- 條目列表新到舊排序、有空狀態。

**Non-Goals:**
- 分類（冒險日誌/世界觀筆記）、標籤、搜尋/篩選（後續）。
- 跨 session 持久化、Supabase 同步、附件/圖片（後續）。
- 富文本（本次純文字多行內文）。

## Decisions

### 1. 資料模型 `JournalEntry`
freezed：`id`(String)、`title`(String)、`body`(String)、`createdAt`(DateTime)、`updatedAt`(DateTime)。
- `id` 以 `DateTime.now().millisecondsSinceEpoch` 字串生成（無需新套件）。
- json_serializable 以 ISO 字串序列化 DateTime。

### 2. 歸屬角色：`Character.journalEntries`
`Character` 新增 `@Default(<JournalEntry>[]) List<JournalEntry> journalEntries`。Journal 頁讀 `currentCharacter.journalEntries`；切換角色即換（沿用 switch-character 的 upsert/載入）。

### 3. 狀態方法
`CurrentCharacterNotifier`：
- `addJournalEntry(title, body)`：建立 `JournalEntry`（id+now），加入清單。
- `updateJournalEntry(id, title, body)`：更新對應條目並設 `updatedAt = now`。
- `removeJournalEntry(id)`：移除。

### 4. UI：列表頁（右下角浮動新增）
`JournalPage`（ConsumerWidget）：
- 依 `updatedAt` 新到舊列出條目卡（標題、日期、內文摘要 2 行）；無條目 → 空狀態卡。
- **右下角浮動新增按鈕（FAB）**：因 shell 的 Scaffold 不便掛 FAB、且底欄浮動，改以 `Stack` + `Positioned`（right 16、bottom = `bottomNavClearance + 8`）放一個 `FloatingActionButton`（`Icons.add`），確保浮在底欄之上。
- 列表底部留白足夠（FAB + 底欄）。
- 點 FAB → 編輯頁（新增）；點條目卡 → 編輯頁（編輯）。
- **全螢幕推進**：以 `Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(...))`，覆蓋角色頁首與底欄（否則會推進 shell 內層 navigator、殘留頁首與空白）。

### 5. UI：編輯頁（Apple Notes 式，單一輸入框）
`JournalEditorPage`（接收可選 `JournalEntry`；null = 新增），全螢幕含 `AppBar`：
- **AppBar 右側**：儲存（勾）；編輯既有時另有刪除（垃圾桶，確認後刪）。左側返回。
- **頂端日期列**：顯示「新增 YYYY/MM/DD」；若曾編輯再顯示「· 編輯 YYYY/MM/DD」（新增中顯示今日）。
- **單一多行輸入框**（`expands` 填滿、無框線）：**不另設標題欄**；**第一行視為標題、其餘為內文**（Apple Notes 式）。新增時自動聚焦。
- 儲存：以換行切分，第一行 trim 為標題（空則「未命名」）、其餘為內文；新增 → `addJournalEntry`、編輯 → `updateJournalEntry`，返回。標題與內文皆空則直接返回不建立。
- 載入既有：輸入框文字 = `title` +（內文非空時）`\n` + `body`。
- 刪除 → 確認後 `removeJournalEntry` 返回。

## Risks / Trade-offs

- **[日誌掛在 Character]** → 與其他角色資料一致、切換即跟著；但 `Character` 模型變大。可接受（領域上日誌本就屬角色）。
- **[編輯頁用 Navigator 而非 go_router]** → 與既有路由並行；葉節點編輯可接受，未來要深連結再轉 go_router。
- **[純文字內文]** → 無富文本/附件；後續再擴充。
