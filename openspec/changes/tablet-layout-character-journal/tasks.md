# Tasks: tablet-layout-character-journal

## 1. 角色頁

- [x] 1.1 `CharacterPage` 依級距切排列：compact 現行；medium 置中限寬 700；expanded 左欄常駐總覽（2:3 分欄）+ 右欄四 tab（屬性/法術/物品/傳記）
- [x] 1.2 expanded 的 tab index 獨立持有（四 tab 清單），旋轉重置可接受

## 2. 旅程頁

- [x] 2.1 `JournalPage` 依級距切排列：compact 現行；medium 置中限寬 600；expanded 卡片奇偶分雙欄（單一捲動、FAB/空狀態不變）

## 3. 驗證

- [x] 3.1 `flutter analyze` 零警告、`flutter test` 全過
- [x] 3.2 實體 iPad 橫向：角色頁總覽常駐＋右欄四 tab 可切換；旅程頁雙欄卡片
- [x] 3.3 實體 iPad 直向：兩頁單欄置中限寬
- [x] 3.4 compact 路徑程式不變（回歸由測試與程式路徑保證）
