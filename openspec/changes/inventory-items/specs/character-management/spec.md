# character-management Delta

## MODIFIED Requirements

### Requirement: 物品頁
物品頁 SHALL 顯示財富與可管理的物品欄。

#### Scenario: 財富
- **WHEN** 物品頁顯示
- **THEN** 五種錢幣橫排顯示（PP/GP/EP/SP/CP），各有獨特圖示

#### Scenario: 物品分區
- **WHEN** 物品頁顯示
- **THEN** 物品依狀態分區：「已裝備 Equipped」（武器/護甲且 equipped）與「攜帶中 Carried」（其餘）
- **THEN** 每個物品卡片包含：類型圖示、中英文名稱、類型標籤、數量（>1 時）、任務物品徽章（quest=true 時）、傷害骰或功能 tag

#### Scenario: 管理入口
- **WHEN** 物品頁顯示
- **THEN** 物品區塊標題列提供新增入口（目錄挑選／自訂輸入）
- **THEN** 物品列上可直接操作：數量調整、使用（消耗品）、裝備切換（武器/護甲）、左滑刪除
