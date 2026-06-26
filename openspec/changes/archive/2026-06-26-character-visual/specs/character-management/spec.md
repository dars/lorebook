## MODIFIED Requirements

### Requirement: Character 頁面次級 Tab
Character 頁面 SHALL 包含五個次級 Tab：總覽 / 屬性 / 法術 / 物品 / 傳記，以**無框底線式**分頁呈現（與全 app 視覺一致），可水平捲動。

#### Scenario: 次級 Tab 顯示
- **WHEN** 使用者切換至「角色」Tab
- **THEN** 頂部顯示五個次級 Tab，預設「總覽」
- **THEN** 分頁為無框底線式：選取者金色文字 + 底線，未選取灰字
- **THEN** 分頁列可水平捲動

#### Scenario: 各分頁區段一致
- **WHEN** 顯示任一分頁（總覽/屬性/法術/物品/傳記）
- **THEN** 其內部區段（如基本資訊、屬性、技能、施法、裝備、性格…）採用與行動頁相同的可收合區段（CollapsibleSection：強標頭 + 可收合）

### Requirement: 總覽頁
總覽頁 SHALL 顯示角色立繪、基本資訊表格、快速數值列，視覺對齊全 app 的金色/暗黑奇幻主題。

#### Scenario: 角色立繪
- **WHEN** 總覽頁顯示
- **THEN** 頂部顯示大面積角色圖片區，採暖金/暗黑漸層（與主題一致，非紫藍）
- **THEN** 圖片上覆蓋顯示：職業 + 子職、中/英文角色名、背景·陣營·信仰

#### Scenario: 基本資訊表格
- **WHEN** 總覽頁顯示
- **THEN** 以 2 欄格狀排列顯示基本資訊（物種、生物類型、體型、陣營、信仰、背景等）
- **THEN** 採精簡密度（列距收斂）
- **THEN** 以與行動頁區段相同的可收合區段（CollapsibleSection：強標頭 + 可收合）標示「基本資訊」

#### Scenario: 快速數值列
- **WHEN** 總覽頁顯示
- **THEN** 底部橫排顯示四個圓角卡片：Speed 速度、Prof 熟練加值、Perc 被動察覺、DC 法術 DC
- **THEN** 採金色/暗黑主題
- **THEN** 以與行動頁區段相同的可收合區段（CollapsibleSection）標示「戰鬥數值」
