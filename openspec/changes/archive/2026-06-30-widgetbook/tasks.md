## 1. 安裝與設定

- [x] 1.1 加入 widgetbook 套件；widgetbook/annotation 置 dependencies（lib/ 有引用）、generator 置 dev；`flutter pub get`
- [x] 1.2 `*.directories.g.dart` 已被既有 `*.g.dart` 忽略規則涵蓋
- [x] 1.3 確認 build_runner 可同時產生 freezed 與 widgetbook 目錄

## 2. 進入點與 Addons

- [x] 2.1 `lib/widgetbook.dart`：`Widgetbook.material` + `@App`，`directories`（generated）
- [x] 2.2 Addons：主題（AppTheme 暗黑預設 + 亮色）、ViewportAddon（iPhone13 + iPad Pro 11）、文字縮放、對齊
- [x] 2.3 驗證 `flutter run -t lib/widgetbook.dart` 可啟動（已截圖）
- [x] 2.4 use-case 包 Scaffold 套用主題深色背景，避免白底畫布顯示異常

## 3. 首批 use-case（@UseCase）

- [x] 3.1 共用元件：CollapsibleSection、ParchmentCard、SectionTitle、EntryCard（武器/法術）、CompactStatRow、StatRow、GoldPips
- [x] 3.2 六角屬性圖提升為公開 `AbilityHexChart` 並收錄（建角頁改用之）
- [x] 3.3 屬性盾牌 AbilityShield 收錄
- [x] 3.4 use-case 以假資料 + knobs（文字/布林/數值）提供可調參數
- [x] 3.5 其餘 private 元件（建角內部卡片、技能列、英雄卡、決策頁 sections）之提升與收錄 → 移至 backlog `widgetbook-coverage`（選擇性逐步進行）

## 4. 驗證

- [x] 4.1 `flutter analyze` 無錯誤、build_runner 產出成功
- [x] 4.2 型錄可啟動、首批元件顯示、主題/裝置/文字縮放切換（實機點測）
- [x] 4.3 正式 App（`lib/main.dart`）與 bundle 不受影響（獨立進入點）
