## MODIFIED Requirements

### Requirement: Movement 移動區塊
Decision 頁面 SHALL 以**單列精簡**方式顯示移動相關數值（速度與衝刺），不使用方塊卡片。

#### Scenario: 速度與衝刺（單列）
- **WHEN** Movement 區塊顯示
- **THEN** 於同一列以 inline 方式顯示速度（ft + 格數）與衝刺（ft + 格數）
- **THEN** 速度為主要數值、衝刺為次要；格數以小字輔助
- **THEN** 不使用兩張方塊卡，整列高度約一行
