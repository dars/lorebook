# component-catalog Specification

## Purpose
TBD - created by archiving change widgetbook. Update Purpose after archive.
## Requirements
### Requirement: 元件型錄（Widgetbook）
專案 SHALL 提供以 Widgetbook 建立的元件型錄，作為開發用工具，與正式 App 分離且不進入產品 bundle。

#### Scenario: 獨立啟動
- **WHEN** 開發者以 `flutter run -t lib/widgetbook.dart` 啟動
- **THEN** 顯示 Widgetbook 元件型錄 App，正式 App 進入點與 bundle 不受影響

#### Scenario: 主題與裝置切換
- **WHEN** 於型錄中檢視任一元件
- **THEN** 可切換主題（暗黑為主 / 亮色，取自正式 AppTheme）
- **THEN** 可切換裝置框（手機 / 平板，涵蓋 600dp breakpoint）與文字縮放

#### Scenario: 元件收錄（generated）
- **WHEN** 元件以 `@UseCase` 標註並執行 build_runner
- **THEN** 該 use-case 自動被收集進型錄目錄
- **THEN** 首批涵蓋共用元件、建角元件、角色卡分頁元件、決策頁區段

#### Scenario: 元件可調參數
- **WHEN** 檢視支援參數的 use-case
- **THEN** 可透過 knobs 調整關鍵參數（文字、布林、列舉等）即時預覽

