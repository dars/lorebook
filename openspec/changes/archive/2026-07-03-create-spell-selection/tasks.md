# Tasks: create-spell-selection

## 1. 施法機制常數（character_creation_data.dart）

- [x] 1.1 `ClassOption` 新增 `cantripsKnown` / `preparedSpells` / `level1Slots` 三個 int 欄位（預設 0）
- [x] 1.2 依 2024 PHB 逐職業覆核並填入八個施法職業的數值（吟遊詩人、牧師、德魯伊、聖騎士、遊俠、術士、邪術師、法師）；非施法職業維持 0

## 2. CatalogSpell → Character.Spell 反正規化

- [x] 2.1 實作 entries 純文字壓平（用 `ftTokenize` 取標記顯示名；list 項目換行連接、table 捨棄），放 catalog feature 下供共用
- [x] 2.2 實作 `casting_time` / `range` 的顯示字串 formatter（如 `1 action`、`120呎`、`觸及`、`自身`）
- [x] 2.3 實作 `CatalogSpell → Spell` 映射（name/nameEn/level/concentration 直取、description 壓平、prepared: true）＋ 單元測試（用真實 v_spells 資料列 fixture）

## 3. 建角流程：法術步驟 UI

- [x] 3.1 `_steps` 改為依所選職業動態產生（施法 7 步 / 非施法 6 步），返回與步驟指示器隨之正確
- [x] 3.2 法術步驟頁：戲法區與一環區（各「已選 x/N」計數；職業戲法數 0 時隱藏戲法區），清單 watch `spellCatalogProvider((level, className))`
- [x] 3.3 法術列 widget：名稱＋英文名＋學派/專注徽章，點擊展開 `FtEntriesView` 完整描述，勾選達上限 disable；觸控目標 ≥ 48dp
- [x] 3.4 「下一步」閘門：戲法與一環皆選滿才放行（離線降級除外）
- [x] 3.5 離線降級：provider error 時顯示「內容庫離線」提示＋重試鈕，放行「下一步」允許跳過

## 4. 確認與建立

- [x] 4.1 確認頁新增 SPELLS 區塊（戲法與一環分列，含中英名）
- [x] 4.2 `_buildCharacter()` 帶入 `cantrips` / `spells` / `spellSlots`（依 `level1Slots`）；跳過法術時法術清單為空但法術位仍建立
- [x] 4.3 手動驗證施法 DC / 命中在確認頁與建立後角色卡上正確（沿用既有推導）

## 5. 驗證

- [x] 5.1 `flutter analyze` 零警告、`flutter test` 全過
- [x] 5.2 模擬器 e2e：建一個法師（選 3 戲法 + 4 一環）→ 確認頁顯示法術 → 建立後法術頁看得到所選法術與法術位 → 雲端 `user_characters.data` 含法術
- [x] 5.3 模擬器 e2e：建一個野蠻人（無法術步驟、6 步完成）；驗證聖騎士（無戲法區、只有一環區）
- [x] 5.4 離線情境（登出或斷網）：法術步驟顯示降級提示且可跳過完成建角
