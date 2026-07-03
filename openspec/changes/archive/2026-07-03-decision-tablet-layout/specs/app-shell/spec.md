# app-shell Delta

## MODIFIED Requirements

### Requirement: Responsive Layout 框架
App SHALL 提供 ResponsiveLayout widget，依螢幕寬度以三段式級距切換版型（對齊 Material 3 window size class）：compact（<600dp）、medium（600–840dp，如 iPad 直向）、expanded（≥840dp，如 iPad 橫向）。未提供 expanded 版型時，≥840dp 沿用 medium/tablet 版型（向後相容）。

#### Scenario: compact 版型
- **WHEN** 螢幕寬度 < 600dp
- **THEN** 顯示手機版型（單欄）

#### Scenario: medium 版型
- **WHEN** 螢幕寬度 ≥ 600dp 且 < 840dp
- **THEN** 顯示 medium 版型；內容排列沿用手機單欄，得置中限寬

#### Scenario: expanded 版型
- **WHEN** 螢幕寬度 ≥ 840dp
- **THEN** 顯示 expanded 版型（多欄）；該頁未提供 expanded 版型時沿用 medium

#### Scenario: 級距查詢
- **WHEN** 頁面需依級距調整參數
- **THEN** 可透過 ResponsiveLayout 的靜態查詢取得目前級距
