# character-management Specification

## Purpose
TBD - created by archiving change lorebook-initial-app-architecture. Update Purpose after archive.
## Requirements
### Requirement: 角色選擇畫面
App SHALL 在登入後顯示角色選擇畫面，列出使用者所有角色並支援新增、修改、刪除。

#### Scenario: 顯示角色列表
- **WHEN** 使用者進入角色選擇畫面
- **AND** 有既有角色
- **THEN** 顯示角色卡片列表（含名稱、職業、等級）

#### Scenario: 無角色時的空狀態
- **WHEN** 使用者進入角色選擇畫面
- **AND** 無任何角色
- **THEN** 顯示引導新增角色的提示

#### Scenario: 選擇角色進入主畫面
- **WHEN** 使用者點擊某個角色
- **THEN** 將該角色設為當前角色
- **THEN** 導航至 Decision 主畫面

### Requirement: 新增角色（簡化版）
App SHALL 允許使用者新增角色（本階段為簡化版，僅基本欄位）。

#### Scenario: 新增角色
- **WHEN** 使用者在角色選擇畫面點擊新增
- **AND** 輸入角色名稱與基本資訊
- **THEN** 新角色被建立
- **THEN** 角色列表刷新

### Requirement: 刪除角色
App SHALL 允許使用者刪除自己的角色。

#### Scenario: 刪除確認
- **WHEN** 使用者觸發角色刪除
- **THEN** 顯示確認對話框
- **WHEN** 使用者確認
- **THEN** 角色被刪除
- **THEN** 角色列表刷新

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

### Requirement: 屬性頁
屬性頁 SHALL 顯示六大能力值（盾牌造型）與技能清單（依能力值分組）。

#### Scenario: 能力值盾牌
- **WHEN** 屬性頁顯示
- **THEN** 六大能力值以盾牌造型排列（3×2 grid）
- **THEN** 每個盾牌顯示：中文名、修正值（大字）、英文縮寫、原始數值
- **THEN** 施法主屬性以深綠強調色標示

#### Scenario: 技能清單
- **WHEN** 屬性頁顯示
- **THEN** 技能依對應能力值分組
- **THEN** 每組左側顯示小盾牌（能力值 + 修正值）
- **THEN** 熟練技能以實心圓點標記，加值以強調色顯示
- **THEN** 非熟練技能以空心圓表示

### Requirement: 法術頁
法術頁 SHALL 顯示施法數值、戲法清單、已備法術清單。

#### Scenario: 施法數值
- **WHEN** 法術頁顯示
- **THEN** 頂部顯示三欄卡片：施法屬性、法術豁免 DC、法術命中
- **THEN** 下方顯示每日法術位上限
- **THEN** 備註法術位即時消耗於「行動」頁追蹤

#### Scenario: 戲法
- **WHEN** 法術頁顯示
- **THEN** 戲法以全寬條目卡 `EntryCard` 逐項排列（徽章「戲」），顯示中英文法術名、射程、傷害
- **THEN** 有描述的戲法可點按展開

#### Scenario: 已備法術
- **WHEN** 法術頁顯示
- **THEN** 法術依環數分段，以 `EntryCard` 顯示（徽章為環數）
- **THEN** 每張卡片含中英文名稱、射程、效果摘要（傷害骰依傷害類型上色）
- **THEN** 點按可展開描述與升級/升環效應

### Requirement: 物品頁
物品頁 SHALL 顯示財富與裝備清單。

#### Scenario: 財富
- **WHEN** 物品頁顯示
- **THEN** 五種錢幣橫排顯示（PP/GP/EP/SP/CP），各有獨特圖示

#### Scenario: 裝備
- **WHEN** 物品頁顯示
- **THEN** 分為「已裝備 Equipped」與「未裝備 Carried」兩區塊
- **THEN** 每個物品卡片包含：類型圖示、中英文名稱、類型標籤、傷害骰或功能 tag

### Requirement: 傳記頁
傳記頁 SHALL 顯示角色背景故事、性格與特長。

#### Scenario: 其人其事
- **WHEN** 傳記頁顯示
- **THEN** 顯示角色背景故事描述
- **THEN** 下方顯示性格標籤列

#### Scenario: 性格
- **WHEN** 傳記頁顯示
- **THEN** 顯示四個欄位：特質、理念、羈絆、缺陷

#### Scenario: 特長
- **WHEN** 傳記頁顯示
- **THEN** 顯示職業/背景/種族特性列表（含中英名稱 + 描述）
- **THEN** 顯示語言欄位

### Requirement: 當前角色資料來源
當前角色 SHALL 由「已選角色 id」從角色清單載入；全 App 角色情境分頁以此當前角色呈現資料。

#### Scenario: 依選取載入當前角色
- **WHEN** 已選角色 id 對應到清單中的角色
- **THEN** 當前角色為該角色，所有角色情境分頁顯示其資料

#### Scenario: 未選取時的回退
- **WHEN** 尚未選取任何角色（如開發直接進入主畫面）
- **THEN** 當前角色回退為清單第一位，畫面仍正常顯示

#### Scenario: 切換時保留編輯（session 內）
- **WHEN** 使用者切換到另一角色
- **THEN** 切換前的當前角色暫存編輯（HP、資源等）寫回角色清單
- **THEN** session 內切回該角色時，先前編輯仍在

