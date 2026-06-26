## Context

角色頁：`CharacterTabBar`（膠囊外框分頁）+ `OverviewTab`（`_Hero` 340px 紫藍漸層、`_InfoGrid` ParchmentCard 2 欄、`_StatCards` 四格）。本變更純視覺，對齊行動頁已建立的金色/暗黑語言；結構與資料不變。

## Goals / Non-Goals

**Goals:**
- 英雄卡配色與全 app 主題一致（暖金/暗黑）。
- 次級分頁改底線式，與檢定分頁一致。
- 總覽資訊密度與區段標頭對齊行動頁。

**Non-Goals:**
- 屬性/法術/物品/傳記分頁內部重排（本次不深入）。
- 真實角色立繪（仍佔位浮水印）。
- 資料模型／互動變更。

## Decisions

### 1. 英雄卡配色（暖金/暗黑）
- 漸層由 `#2A2438 → #1C1A2A → #14110C`（紫藍）改為 **`#2E2418 → #1E160C → #14110C`**（暖棕→暗）。
- 保留：金色立繪浮水印、底部加深漸層（文字可讀）、角色名（NotoSerifTC 44）+ 英文名（Cinzel 字距）+ 職業/背景覆蓋資訊。
- 可加極淡的金色頂部細線/邊框呼應古書風（選用）。高度 340 可微縮至 ~320。

### 2. 次級分頁改底線式
- `CharacterTabBar` 由膠囊外框改為**無框底線式**：每個分頁為「文字 + 底線指示」，選取金色粗體 + 金色底線、未選取灰字；維持 `SingleChildScrollView` 水平捲動。
- 與 `checks` 的底線分頁一致的視覺語言。

### 3. 資訊欄位密度
- `_InfoGrid` 列距由 `vertical: lg(16)` → `md(12)`；`InfoField` 值 16→15、標籤維持。
- 維持 2 欄 + 分隔線。

### 4. 區段與行動頁完全統一（CollapsibleSection）
- 「基本資訊」「戰鬥數值」改用與行動頁（狀態/移動/反應）**完全相同的 `CollapsibleSection`**：強標頭（金 chevron + 金英文小標 + 粗白中文 + 分隔線）且**可收合**，不用較弱的 `SectionTitle`。
- `_InfoGrid`、`_StatCards` 作為各自 CollapsibleSection 的 child。
- `_StatCards` 維持四格、確保金色主題。

## Risks / Trade-offs

- **[僅總覽 + 分頁列]** → 其他四個分頁本次不重排；分頁列與主題一致性已能提升整體觀感，內部排版列為後續。
- **[底線分頁可捲動]** → 5 個分頁可能超出寬度，維持水平捲動；底線指示需跟隨選取項。
