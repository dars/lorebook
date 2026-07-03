# journal Delta

## MODIFIED Requirements

### Requirement: Journal 頁面骨架
Journal 頁面 SHALL 以條目列表呈現當前角色的冒險日誌，並提供新增入口；日誌歸屬當前角色，切換角色即顯示該角色的日誌。expanded（≥840dp）時卡片以雙欄排列；medium 單欄置中限寬；compact 維持現行。

#### Scenario: 頁面顯示
- **WHEN** 使用者切換至「旅程」Tab
- **THEN** 顯示當前角色的日誌條目列表（標題、日期、內文摘要），依更新時間新到舊排序
- **THEN** 右下角顯示浮動新增按鈕（FAB），浮於底部導航之上

#### Scenario: 空狀態
- **WHEN** 當前角色尚無任何日誌
- **THEN** 顯示空狀態提示
- **THEN** 仍可由右下角浮動新增按鈕新增

#### Scenario: 切換角色換日誌
- **WHEN** 使用者切換當前角色
- **THEN** 旅程頁顯示新角色的日誌條目

#### Scenario: expanded 雙欄卡片流
- **WHEN** 寬度 ≥ 840dp（iPad 橫向）
- **THEN** 日誌卡片依排序左右雙欄分配，整頁單一捲動
- **THEN** FAB 與空狀態行為不變

#### Scenario: medium 限寬
- **WHEN** 寬度 600–840dp（iPad 直向）
- **THEN** 單欄排列同手機，內容置中限寬
