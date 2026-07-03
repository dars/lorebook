# Proposal: tablet-layout-character-journal

## Why

Decision 頁已完成三段式版型（decision-tablet-layout），但角色頁與旅程頁在 iPad 上仍是被拉寬的手機單欄：角色頁五個 tab 在橫向大螢幕上一次只能看一種資訊（跑團時「總覽 + 法術」要來回切）；旅程頁單欄卡片在 1194pt 寬下每張卡被拉到誇張的寬度。沿用既有 `ResponsiveLayout` 三段式，把兩頁的 expanded/medium 排列補齊。

## What Changes

- **角色頁 expanded（iPad 橫向）雙欄**：左欄常駐「總覽」（跑團時最常查的摘要），右欄為其餘四個 tab（屬性/法術/物品/傳記）的分頁區——總覽自 tab 清單移除、改為常駐
- **角色頁 medium（iPad 直向）**：維持五 tab 單欄，內容置中限寬
- **旅程頁 expanded 雙欄卡片流**：筆記卡片分兩欄排列（依序左右分配）；編輯器維持推頁全螢幕（master-detail 另案）
- **旅程頁 medium**：單欄置中限寬
- compact（手機）兩頁皆不變

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `character-management`: 「Character 頁面次級 Tab」requirement 增列版型行為——expanded 總覽常駐左欄、右欄四 tab；medium/compact 維持五 tab 單欄（medium 限寬）
- `journal`: 「Journal 頁面骨架」requirement 增列版型行為——expanded 雙欄卡片流、medium 限寬

## Impact

- **資料層**：無
- **程式碼**：`character_page.dart`（排列層）、`journal_page.dart`（排列層）；各 tab/section 實作不動
- **版型**：手機不變；iPad 直向限寬、橫向雙欄
- **相依**：無
