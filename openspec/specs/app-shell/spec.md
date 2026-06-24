# app-shell Specification

## Purpose
TBD - created by archiving change lorebook-initial-app-architecture. Update Purpose after archive.
## Requirements
### Requirement: App 入口與 ProviderScope
App SHALL 在 Supabase.initialize() 完成後才啟動 widget tree，並以 Riverpod ProviderScope 包裹根 widget。

#### Scenario: App 啟動
- **WHEN** App 啟動
- **THEN** Supabase.initialize() 先完成
- **THEN** widget tree 被 ProviderScope 包裹

### Requirement: D&D 古書風格主題
App SHALL 使用 D&D 奇幻古書風格主題，色系以羊皮紙暖色（米/棕/金）搭配深綠強調色，非 Material 3 預設外觀。

#### Scenario: 亮色主題
- **WHEN** App 以亮色模式顯示
- **THEN** 背景為羊皮紙暖色調
- **THEN** 強調色為深綠色
- **THEN** 卡片四角有古書風格角飾

#### Scenario: 暗色主題
- **WHEN** App 以暗色模式顯示
- **THEN** 背景為深棕/深灰色調
- **THEN** 強調色為金色

#### Scenario: 主題跟隨系統設定
- **WHEN** 裝置切換暗色模式
- **THEN** App 自動切換至暗色主題

### Requirement: 視覺裝飾元件
App SHALL 提供 D&D 風格的裝飾元件，所有裝飾以「低存在感」為原則，不影響資訊層級與閱讀體驗。

#### Scenario: 卡片角飾
- **WHEN** 卡片元件顯示
- **THEN** 四角有細緻古書風格角飾

#### Scenario: 分隔線
- **WHEN** 區塊之間需要分隔
- **THEN** 使用 D&D 元素作為分隔線點綴

#### Scenario: 背景紋理
- **WHEN** 頁面背景顯示
- **THEN** 加入極淡的地圖/法陣紋理

### Requirement: 四 Tab 書籤導航
App SHALL 提供底部四 Tab 導航列（書籤造型）：行動 / 角色 / 旅程 / 設定。

#### Scenario: 手機底部導航
- **WHEN** App 在手機版型顯示（寬度 < 600dp）
- **THEN** 底部顯示書籤造型的 BottomNavigationBar
- **THEN** 包含四個 Tab：行動、角色、旅程、設定

#### Scenario: 平板導航
- **WHEN** App 在平板版型顯示（寬度 ≥ 600dp）
- **THEN** 左側顯示 NavigationRail

#### Scenario: 預設 Tab
- **WHEN** 使用者進入主畫面
- **THEN** 預設顯示「行動」Tab（Decision）

### Requirement: 情境式頁首
App SHALL 依分頁是否綁定當前角色，顯示對應的頁首：角色情境頁顯示共用角色頭區塊，全域/系統頁顯示純標題頁首。

每個導航分頁以 `characterScoped` 旗標標記是否屬於角色情境。

#### Scenario: 角色情境頁顯示角色頭
- **WHEN** 使用者在角色情境分頁（行動 / 角色 / 旅程）
- **THEN** 頂部顯示角色徽章 + 角色名稱（含下拉箭頭）+ 種族·職業 + Level 徽章

#### Scenario: 全域頁顯示純標題頁首
- **WHEN** 使用者在全域/系統分頁（設定）
- **THEN** 頂部顯示純標題頁首（`PageHeader`，含分頁名稱），不顯示角色資訊

#### Scenario: 切換角色
- **WHEN** 使用者點擊角色名稱下拉
- **THEN** 顯示角色切換選單
- **WHEN** 選擇不同角色
- **THEN** 所有角色情境分頁的資料切換至新角色

### Requirement: 導航定義單一來源
App SHALL 以單一清單（`appDestinations`）定義所有主導航分頁的 path、icon、label 與 `characterScoped` 旗標，供底部書籤列、平板 NavigationRail 與路由切換共用，避免多處重複定義。

#### Scenario: 共用導航清單
- **WHEN** 底部書籤列、NavigationRail 或頁首需要分頁資訊
- **THEN** 皆讀取同一份 `appDestinations`，新增/調整分頁只需修改一處

### Requirement: 浮動導航底部留白
採用 `extendBody` 的浮動底部導覽列下，各捲動頁面 SHALL 在內容底部保留足夠留白，避免內容被導覽列遮住；留白值 SHALL 隨裝置安全區自動調整。

#### Scenario: 內容不被遮住
- **WHEN** 任一頁面捲動至底部
- **THEN** 最後的內容完整顯示於浮動導覽列之上（透過共用的底部留白 helper 計算，含安全區）

### Requirement: 共用條目卡 EntryCard
App SHALL 提供可重複使用的條目卡元件 `EntryCard`，供法術、戲法、武器等清單共用（Decision 與 Character 頁面一致）。

#### Scenario: 收合樣式
- **WHEN** `EntryCard` 顯示
- **THEN** 單一卡片內含：左側徽章、中文名 + 英文名、右側資訊（射程等）與主要數值
- **THEN** 有可展開內容時顯示展開指示

#### Scenario: 展開描述
- **WHEN** 使用者點按可展開的 `EntryCard`
- **THEN** 卡片下方出現分隔線與較深底色的描述面板
- **THEN** 顯示描述本文，並可附補充說明（如升級/升環效應）

### Requirement: 傷害類型配色
App SHALL 以 `ThemeExtension`（`DndColors`）集中定義各傷害類型（火/冰/閃電/力場/物理等）的顏色，供數值上色使用，並可依主題（亮/暗）或日後使用者設定整套替換。

#### Scenario: 依類型上色
- **WHEN** 顯示帶傷害類型的數值（法術/武器傷害）
- **THEN** 數值顏色取自 `DndColors` 對應類型

#### Scenario: 整套切換
- **WHEN** 切換主題或套用使用者自訂配色
- **THEN** 所有傷害類型顏色隨該套 `DndColors` 一併更新

### Requirement: Responsive Layout 框架
App SHALL 提供 ResponsiveLayout widget，依螢幕寬度切換手機與平板版型。

#### Scenario: 手機版型
- **WHEN** 螢幕寬度 < 600dp
- **THEN** 顯示手機版型（單欄）

#### Scenario: 平板版型
- **WHEN** 螢幕寬度 ≥ 600dp
- **THEN** 顯示平板版型（雙欄/master-detail）

