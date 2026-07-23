# Proposal: 職業資源（ClassResource）推導

## Why

建角與升級流程從不產生 `ClassResource`——資源區的職業資源（吟遊激勵、狂暴、氣、術法點數等）目前只存在於手寫的範例角色，自建角色的資源區只有法術位。Decision 頁的資源顯示規格（`decision` spec「Resources 資源區塊」）早已定義三種顯示型態，缺的是資料來源：一張可推導的職業資源規則表，以及建角/升級兩條管線的接入。

## What Changes

- 新增**內建職業資源規則表**（App 內建固定清單，與 `kClasses`/`featureArmorViolation` 同哲學，不做通用規則引擎）：涵蓋 SRD 5.2 十二職業的即時消耗型資源，每筆定義：
  - 次數/池量公式（固定值、隨等級成長、或依能力調整值，如吟遊激勵＝魅力調整值）
  - 骰面成長（如吟遊激勵 d6 → 5/10/15 級升骰）
  - 恢復時機（短休/長休）與顯示型態（pips / number / dice）
  - 獲得等級（如狂暴 Lv1、術法點數 Lv2）
- **建角流程**：依職業與等級（建角固定 Lv1）生成初始 `resources`
- **升級流程**：升級確認時依規則表同步 max/骰面（如狂暴 3 級 2→3 次），current 依比例保留或補滿（設計階段定案）；新獲得的資源（如術士 2 級術法點數）自動加入
- **舊角色回填**：角色讀取時一次性補寫缺漏的職業資源（與 weapons→equipment 轉換同模式）；已有同名資源（含使用者手動情境）不覆寫
- 範例角色資料改由規則表生成或校正，消除「範例比管線完整」的落差

## Capabilities

### New Capabilities
- `class-resource-derivation`: 職業資源規則表的內容範圍（SRD 5.2 十二職業）、推導公式、建角/升級接入點、舊資料回填行為

### Modified Capabilities
- `character-management`: 建角快照 SHALL 包含依職業推導的初始職業資源（原規格未涵蓋 resources 欄位的生成）

## Impact

- **資料層**：僅角色卡資料（`Character.resources`）；規則表為 App 內建 Dart 常數，不新增資料表、不動靜態內容庫與 Campaign 同步
- **程式碼**：
  - 新增 `lib/features/character/domain/class_resources.dart`（規則表＋推導函式）
  - `character_create_page.dart`（建角生成）、`character_level_up_page.dart`（升級同步）
  - `character_providers.dart` 或載入路徑（讀取時回填）
  - `character.dart` 範例角色資料校正
- **版型**：無 UI 變更——資源區顯示三型態已實作，手機/平板皆沿用現狀
- **相依**：無新第三方套件；規則內容以 SRD 5.2 為準（content-scope 政策內）
