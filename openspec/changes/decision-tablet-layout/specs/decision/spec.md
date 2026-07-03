# decision Delta

## ADDED Requirements

### Requirement: Decision 頁面版型級距
Decision 頁 SHALL 依寬度級距切換排列：compact 與 medium 為單欄縱向（medium 置中限寬），expanded（≥840dp，iPad 橫向）為三欄並排（依 designs.pen「行動 iPad」）。三欄僅重新分配既有 section，內容與互動不因版型而異。

#### Scenario: compact 單欄
- **WHEN** 寬度 < 600dp
- **THEN** 單欄縱向排列：狀態 / 資源 / 移動 / 動作經濟 / 檢定 / 休息，維持現行行為

#### Scenario: medium 單欄限寬
- **WHEN** 寬度 600–840dp（如 iPad 直向）
- **THEN** 排列與 compact 相同，內容置中且限制最大寬度

#### Scenario: expanded 三欄
- **WHEN** 寬度 ≥ 840dp（如 iPad 橫向）
- **THEN** 三欄並排：欄 1〔狀態、資源、移動、休息〕、欄 2〔動作〕、欄 3〔附贈動作、反應、檢定〕
- **THEN** 各欄獨立捲動
- **THEN** 各 section 的互動（HP 增減、法術位、收合等）與單欄版一致
