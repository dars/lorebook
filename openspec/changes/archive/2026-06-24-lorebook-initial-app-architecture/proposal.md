## 為什麼

Lorebook 是一款專為 **D&D 5.5e（2024 版規則）** 打造的跑團輔助 App。整個 App 的資料結構、畫面邏輯、數值計算皆服務於 D&D 5e 規則體系——角色的能力值、技能、法術、職業特性、戰鬥動作經濟（Action / Bonus Action / Reaction）等，全部依據規則書定義運作。

目前專案尚無任何 Flutter 程式碼。需要建立初始 App 架構，包含專案骨架、路由、主題、狀態管理基礎設施、Supabase 連線，以及核心功能模組的資料夾結構。

App 的核心設計理念是**時間軸**：以「現在、過去、未來」組織資訊，讓玩家在 DM 說「輪到你了」的 3 秒內，就知道自己有哪些選擇。設計原則為 Progressive Disclosure（漸進式揭露）——減少尋找資訊的摩擦，不減少思考時間。

**Simplicity is not the absence of complexity.**

## 變更內容

### App 啟動流程

Launch Screen → 登入/註冊 → 角色選擇畫面（新增/修改/刪除角色）→ Decision（行動）主畫面

- 首次使用：Launch Screen → 登入 → 角色選擇（無角色時引導新增）→ 進入主畫面
- 已登入且有角色：Launch Screen → 自動進入上次使用的角色 → Decision 主畫面
- 創建角色流程（選種族 → 選職業 → 配能力點 → 背景/故事）為後續規劃，本階段角色選擇畫面先支援簡化新增（僅名稱 + 基本欄位）

### 假資料（Mock Data）

本階段畫面先填入假資料以驗證架構與 UI 呈現。假資料參考「它式自動角卡 V3.9」Excel 角色卡中的範例角色：

**戴夫林（Devlin）— 人類法師 Lv3 劍詠師（塑能學派）**
- 能力值：STR 10(+0) / DEX 12(+1) / CON 12(+1) / INT 17(+3) / WIS 13(+1) / CHA 12(+1)
- HP 17、AC 12（無甲）、Speed 40ft、熟練加值 +2、被動察覺 13、法術 DC 13、法術命中 +5
- 法術位：1環 ×4、2環 ×2
- 戲法：Fire Bolt、Ray of Frost、Mage Hand、Light
- 1環法術：Magic Missile、Burning Hands、Shield、Mage Armor
- 武器：法杖 Quarterstaff（命中 +4、1D6 鈍擊）、匕首 Dagger ×2（命中 +3、1D4 穿刺）
- 裝備：水晶寶珠 Crystal Orb（奧術法器）、法術書 Spellbook、學者背包 Scholar's Pack
- 金幣：25 GP、8 SP、14 CP
- 熟練技能：奧秘 Arcana(+5)、歷史 History(+5)、調查 Investigation(+5)、察言觀色 Insight(+3)、察覺 Perception(+3)、說服 Persuasion(+3)
- 背景：學者 Sage、守序善良 LG、信仰蜜思特拉 Mystra
- 特長：塑能學派 School of Evocation、奧術恢復 Arcane Recovery、學者·研究員 Researcher
- 語言：通用語·矮人語·龍語·精靈語

### 專案基礎建設

- 建立 Flutter 專案骨架（`pubspec.yaml`、`lib/` 結構、平台目錄）
- 設定 feature-first 資料夾結構（`app/`、`features/`、`shared/`）
- 引入核心依賴：`flutter_riverpod`、`riverpod_annotation`、`go_router`、`supabase_flutter`、`freezed`
- 建立 App 入口（`main.dart`）、`ProviderScope`、Supabase 初始化
- 建立 go_router 路由骨架（含 auth guard）
- 建立 Supabase Auth 登入/註冊流程
- 建立 responsive layout 基礎框架（手機/平板 breakpoint 切換）
- 建立 repository pattern 基礎類別（封裝 Supabase 操作）

### 視覺設計語言

- 建立 App 主題：D&D 奇幻古書風格，非 Material 3 預設外觀
- 色系以羊皮紙暖色（米/棕/金）搭配深綠強調色為基調
- 所有裝飾元素以「低存在感」為原則，不影響資訊層級與閱讀體驗
- 卡片四角加入細緻古書風格角飾
- 使用 D&D 元素作為分隔線點綴（低調不搶眼）
- 背景加入極淡的地圖與法陣紋理，提升沉浸感
- 特殊元件造型：法術位使用水晶造型、AC 使用盾牌壓印效果
- 底部導航列使用書籤造型，強化書籍感
- 支援亮色/暗色模式切換

### 四 Tab 主畫面架構（時間軸概念）

**底部導航列（書籤造型）：行動 / 角色 / 旅程 / 設定**

#### Decision（行動）— 現在，此刻輪到你

跑團當下最重要的畫面，是 App 的 Home。頁面由上到下：

1. **角色頭區塊**：角色徽章 + 名稱（下拉可切換角色）+ 種族·職業 + Level 徽章
2. **Status 狀態**：HP（數值 + 血條 + 增減按鈕）、AC（盾牌壓印造型）、專注（顯示施法中法術名稱，可點按結束）、Conditions 異常狀態
3. **Resources 資源**：依職業動態顯示——法術位以水晶造型呈現（依環數分列，顯示剩餘/最大值）、其他職業資源（氣點、吟遊激勵、野性塑形等）
4. **Movement 移動**：速度（ft + 格數）、衝刺（ft + 格數）
5. **Action 動作**：可收合式清單——攻擊（展開顯示武器列表，含命中加值與傷害骰）、施法·戲法（Cantrips）、法術（依環數分類）、其他動作（Dodge、Disengage、Help、Hide、Ready、Search、Use Object）
6. **Bonus Action 附贈動作**：只顯示目前可使用的能力，無可用時顯示提示
7. **Reaction 反應**：只顯示目前可使用的反應，無可用時顯示提示
8. **Checks 檢定**：能力檢定、豁免骰、技能檢定——點選後顯示修正值（+?），玩家自行加上骰面結果
9. **休息**：長休（按下後自動恢復法術位、血量等）、短休（跳出可執行動作視窗：投擲生命骰、奧術恢復等）

#### Character（角色）— 過去，我是誰

角色能力、背景、裝備——定義角色的一切。

**頂部**：與 Decision 共用角色頭區塊（徽章 + 名稱下拉 + 種族·職業 + Level）

**次級選單（頂部 Tab）**：`總覽` / `屬性` / `法術` / `物品` / `傳記`

**總覽頁**（由上到下）：
1. **角色立繪**：大面積角色圖片，圖片上覆蓋顯示職業 + 子職（如「法師 Wizard · 塑能學派」）、中/英文角色名、背景·陣營·信仰摘要
2. **基本資訊表格**（2 欄 x 4 列格狀排列）：Species 物種、Type 生物類型、Size 體型、Alignment 陣營、Gender 性別、Age 年齡、Deity 信仰、Background 背景
3. **快速數值列**（四個圓角卡片橫排）：Speed 速度（呎）、Prof 熟練加值、Perc 被動察覺、DC 法術 DC

**屬性頁**（由上到下）：
1. **Abilities 屬性**：六大能力值以盾牌造型排列（3×2 grid）。每個盾牌顯示：中文名 + 修正值（大字）+ 英文縮寫（STR/DEX/CON/INT/WIS/CHA）+ 原始數值（底部圓圈）。施法主屬性以深綠強調色標示區分
2. **Skills 技能**：依對應能力值分組（智力、感知、敏捷、力量、魅力、體魄），每組左側顯示小盾牌（能力值名 + 修正值），右側列出所屬技能。熟練技能以實心圓點標記且加值以強調色顯示，非熟練技能以空心圓表示。每個技能顯示中英文名 + 總修正值

**法術頁**（由上到下）：
1. **Spellcasting 施法**：三欄數值卡片——Ability 施法屬性（如智力 INT）、Save DC 法術豁免、Attack 法術命中。下方附每日法術位上限（如「1環 ×4、2環 ×2」），備註法術位即時消耗於「行動」頁追蹤
2. **Cantrips 戲法**：2 欄 grid 排列，顯示中英文法術名（如火焰箭 Fire Bolt、寒冰射線 Ray of Frost）
3. **Spellbook 已備法術**：依環數分段（1環 First Level、2環 Second Level…），每個法術卡片含中英文名稱 + 效果摘要（傷害骰如 3×1D4+1，或效果如 +5 AC）

**物品頁**（由上到下）：
1. **Treasury 財富**：五種錢幣橫排顯示（各有獨特圖示）——PP 白金、GP 金幣、EP 銀金、SP 銀幣、CP 銅幣
2. **Equipment 裝備**：分為兩個區塊——
   - **已裝備 Equipped**：裝備中的武器與法器（如法杖 Quarterstaff — 主手武器、1D6 鈍擊；水晶寶珠 Crystal Orb — 奧術法器、施法引導）
   - **未裝備 Carried · 隨身**：隨身但未裝備的物品（匕首 ×2、法術書、背包等），含物品內容物描述
   - 每個物品卡片包含：類型圖示 + 中英文名稱 + 類型/屬性標籤 + 傷害骰或功能 tag

**傳記頁**（由上到下）：
1. **其人其事 About**：角色背景故事描述文字 + 性格標籤列（如「沉靜」「博學」「謹慎」「忠於同伴」等 tag）
2. **Personality 性格**：四個欄位——特質、理念、羈絆、缺陷
3. **Features & Traits 特長**：職業/背景/種族特性列表（含中英名稱 + 簡短描述，如「塑能學派 School of Evocation — 塑能法術更具威力，可保護友軍不受波及」），另有語言欄位（通用語·矮人語·龍語·精靈語等）

#### Journal（旅程）— 經歷了什麼

跑團記錄，log 經歷過的事情與需要注意的事項。詳細內容待後續規劃。

#### System（設定）

App 設定、帳號管理。詳細內容待後續規劃。

### 角色管理

- 建立角色選擇畫面：顯示使用者所有角色（角色卡片含名稱/職業/等級），支援新增、修改、刪除
- 建立角色頭區塊（跨 Tab 共用）：名稱下拉切換當前角色
- 建立角色卡資料模型與 CRUD
- 創建角色完整流程（選種族 → 選職業 → 配能力點 → 背景/故事/性別/信仰）為後續規劃，本階段先支援簡化新增

## 功能模組（Capabilities）

### 新增模組

- `app-shell`：App 入口、D&D 古書風格主題（亮/暗色）、responsive layout 框架（手機/平板）、ProviderScope 設定、四 Tab 書籤導航架構（Decision / Character / Journal / System）、共用角色頭區塊（徽章 + 名稱下拉 + 種族·職業 + Level，跨 Tab 共用）、視覺設計基礎元件（角飾、分隔線、紋理背景、書籤 Tab）
- `routing`：go_router 路由架構，含 auth redirect guard、角色選擇後進入主畫面的導航流程
- `auth`：Supabase Auth 登入/註冊（Email + Google OAuth + Apple Sign In），含 session 管理
- `data-layer`：Repository pattern 基礎、Supabase client 封裝、freezed domain model、錯誤處理慣例
- `character-management`：角色卡 CRUD（建立、讀取、刪除）、角色選擇/切換機制（角色頭下拉切換）、Character 頁面含次級 Tab（總覽/屬性/法術/物品/傳記）、總覽頁（角色立繪 + 基本資訊表格 + 快速數值列）
- `decision`：Decision（行動）頁面——跑團當下的核心畫面。包含角色頭區塊、Status（HP 含增減/AC 盾牌壓印/專注/Conditions）、Resources（法術位水晶造型，依職業動態顯示）、Movement（速度/衝刺含格數換算）、Action（可收合武器清單含命中+傷害/施法/戲法/其他動作）、Bonus Action、Reaction、Checks（能力/豁免/技能檢定修正值）、休息（長休自動恢復/短休互動視窗）
- `journal`：Journal（旅程）頁面——跑團記錄，記錄事件與注意事項

### 修改模組

（無既有模組，全為新建）

## 影響範圍

- **資料層**：角色卡資料（Supabase PostgreSQL CRUD）。靜態遊戲資料（法術、職業清單等）本階段以硬編碼或 JSON 檔案替代，不做完整同步機制
- **版型**：手機與平板版型皆需支援。手機採單欄 + 底部書籤導航；平板採 NavigationRail + 雙欄/master-detail
- **依賴套件**：`flutter_riverpod`、`riverpod_annotation`、`riverpod_generator`、`go_router`、`supabase_flutter`、`freezed`、`freezed_annotation`、`json_annotation`、`json_serializable`、`build_runner`
- **OTA 更新**：整合 Shorebird，支援 Dart 層 code push（`shorebird release` + `shorebird patch`）
- **Supabase**：需要 Auth 設定、`characters` 表（主要欄位與 RLS 規則）
- **平台**：iOS（SPM，非 CocoaPods）與 Android，本階段不含 Web
- **Bundle ID**：`dev.code4soul.lorebook`
- **Flutter 版本**：Flutter 3.44.3 (stable)、Dart 3.12.2、DevTools 2.57.0
