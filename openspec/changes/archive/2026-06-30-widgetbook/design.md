## Context

專案有自有元件庫 + 金色暗黑主題（`AppTheme`/`AppColors`），手機/平板雙版型（600dp）。已用 build_runner（freezed/json_serializable）。導入 Widgetbook 作為開發用元件型錄，與正式 App 分離。

## Goals / Non-Goals

**Goals:**
- Widgetbook 以 generated 方式整合（`@UseCase` + build_runner 自動收集）。
- 獨立進入點、套用正式主題、提供主題/裝置/文字縮放 addons。
- 收錄四大類元件的首批 use-case。

**Non-Goals:**
- golden / 螢幕截圖測試（後續）。
- Widgetbook Cloud / web hosting（後續）。
- 100% 元件覆蓋（漸增）。

## Decisions

### 1. Generated 整合
加入 `widgetbook`、`widgetbook_annotation`、`widgetbook_generator`（dev_dependencies）。以 `@widgetbook.UseCase(name:, type:)` 標註各 use-case 函式；`dart run build_runner build` 產生 `lib/widgetbook.directories.g.dart`（與 freezed 同一 build_runner 流程）。

### 2. 獨立進入點
`lib/widgetbook.dart` 建立 `Widgetbook.material`（或 `@App` + `Widgetbook` root），`directories: directories`（來自 generated）。以 `flutter run -t lib/widgetbook.dart -d <device>` 啟動；不影響 `lib/main.dart` 與產品 bundle。

### 3. Addons
- **主題**：`MaterialThemeAddon`（或自訂），暗黑（預設）+ 亮色，皆取自 `AppTheme`。
- **裝置**：`DeviceFrameAddon`，含手機與平板（涵蓋 600dp breakpoint）。
- **文字縮放**：`TextScaleAddon`。
- **對齊/邊距**：`AlignmentAddon`/`InspectorAddon`（可選）。

### 4. Use-case 放置與 private 元件
- **公開元件**（CollapsibleSection、EntryCard、ParchmentCard、CompactStatRow、GoldPips、AbilityShield…）：use-case 置於 `lib/widgetbook/`（或各 widget 旁），`@UseCase` 引用即可。
- **private 元件**（六角屬性圖 `_HexChart`、決策頁各 section、建角內部卡片）：兩擇一——
  - (a) **提升為公開共用元件**（移到 `shared/` 或 widget 公開化），較乾淨、利於重用；或
  - (b) 於原檔 **co-locate `@UseCase`**（同檔可存取 private），較快但使 feature 檔相依 widgetbook。
  - 原則：可重用者優先 (a) 提升；一次性者用 (b)。首批以能直接收錄的公開元件為主，private 元件逐步提升。

### 5. 主題與資料
- use-case 以正式 `AppTheme.dark`（addon 提供）包裹，確保型錄外觀＝產品外觀。
- 需要資料的元件（如卡片）以 `Character.mock()` / 局部假資料 knob 提供；可用 Widgetbook knobs 調參數（文字、布林、列舉）。

## Risks / Trade-offs

- **[private 元件可及性]** → 需提升或 co-locate `@UseCase`；提升有助重用但是額外重構。
- **[feature 檔相依 widgetbook]** → 採 (b) 時，以 `widgetbook_annotation`（輕量、可置 dev）降低耦合；正式 build 不含 widgetbook 進入點。
- **[build_runner 產物]** → `*.directories.g.dart` 比照 `*.g.dart`/`*.freezed.dart` 加入 `.gitignore`（checkout 後跑 build_runner）。
- **[維護成本]** → generated 自動收集，新增元件只需加 `@UseCase`。
