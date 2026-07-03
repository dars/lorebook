# character-management Delta

## MODIFIED Requirements

### Requirement: Character 頁面次級 Tab
Character 頁面 SHALL 包含五個次級分頁：總覽 / 屬性 / 法術 / 物品 / 傳記，以**無框底線式**分頁呈現（與全 app 視覺一致），可水平捲動。expanded（≥840dp，iPad 橫向）時「總覽」常駐左欄、右欄為其餘四個 tab 的分頁區；medium（iPad 直向）維持五 tab 單欄並置中限寬；compact 維持現行。

#### Scenario: 次級 Tab 顯示
- **WHEN** 使用者切換至「角色」Tab
- **THEN** 頂部顯示五個次級 Tab，預設「總覽」
- **THEN** 分頁為無框底線式：選取者金色文字 + 底線，未選取灰字
- **THEN** 分頁列可水平捲動

#### Scenario: 各分頁區段一致
- **WHEN** 顯示任一分頁（總覽/屬性/法術/物品/傳記）
- **THEN** 其內部區段（如基本資訊、屬性、技能、施法、裝備、性格…）採用與行動頁相同的可收合區段（CollapsibleSection：強標頭 + 可收合）

#### Scenario: expanded 雙欄
- **WHEN** 寬度 ≥ 840dp（iPad 橫向）
- **THEN** 左欄常駐總覽內容，右欄顯示四個次級 Tab（屬性/法術/物品/傳記）與其內容
- **THEN** 兩欄各自獨立捲動

#### Scenario: medium 限寬
- **WHEN** 寬度 600–840dp（iPad 直向）
- **THEN** 五 Tab 單欄排列同手機，內容置中限寬
