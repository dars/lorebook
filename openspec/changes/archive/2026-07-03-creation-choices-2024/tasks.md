# Tasks: creation-choices-2024

## 1. 資料欄位（character_creation_data.dart）

- [x] 1.1 `SpeciesOption` 新增 `skillPickCount` / `skillPickFrom`（人類 1/全 18、精靈 1/洞察·感知·求生）與 `sizeChoices`（人類 Medium/Small）；半身人 traits 補「天生隱匿」

## 2. 背景加值可自選

- [x] 2.1 `_bonusExplain()` 改互動卡：+2/+1 ↔ +1/+1/+1 模式切換；+2/+1 模式下背景三屬性可指派 +2/+1（互斥、同屬性禁止），預設建議值不變
- [x] 2.2 職業/背景變更時重置指派（沿用 `_resetAbilities` 路徑）

## 3. 種族技能與體型

- [x] 3.1 技能步驟新增「種族（選 N）」區（`skillPickCount > 0` 時），重用 `_SkillRow`；已由職業/背景熟練的選項加註記；`_canNext` 納入種族選滿
- [x] 3.2 建立時將種族技能併入 `profSkills`；切換職業/種族時清空種族技能選擇
- [x] 3.3 基本步驟：多體型種族顯示體型切換 chips，建立時寫入所選體型

## 4. 力竭 2024 全文

- [x] 4.1 `_showEffectDialog` 對 Exhaustion 改渲染本地 2024 全文常數（自撰文字），不讀內容庫；其餘狀態行為不變

## 5. 驗證

- [x] 5.1 `flutter analyze` 零警告、`flutter test` 全過（含新資料欄位測試）
- [x] 5.2 模擬器 e2e：精靈法師——鷹眼三選一、背景加值改指派（+2 換屬性）、確認頁技能與屬性正確
- [x] 5.3 模擬器 e2e：人類角色——體型選小型、種族任選技能、確認建立後資料正確
- [x] 5.4 模擬器：力竭 chip 對話框顯示 2024 全文（無六級效果表）
