# Tasks: dual-rules-version

> 依 design D11 分四階段，每階段可獨立上線。階段 1 完成時行為完全不變；
> 5e 選項在階段 4 之前 SHALL 保持隱藏。

## 0. 前置調查（動工前必須完成）

- [x] 0.1 確認 fork 是否仍保有 PHB（2014）中文資料 → **資料完整存在，不需重新翻譯**。當初清除的是 Supabase 內容庫的資料列，非 fork 原始檔。資料為簡體中文 + `ENG_name` 對照 + `srd` 標記，匯入管線的 `deep_convert()`（OpenCC `s2twp`）負責轉繁，與當初 PHB 進 DB 的方式相同。**唯一缺口**：現行 fork `../5etools` 的 `data/class/class-*.json` 中 `subclass` 陣列已被 XPHB 覆蓋（git 初始 commit 即為覆蓋後狀態），PHB 子職需自舊 fork `../5etools-7hd` 取得，其格式為舊版巢狀 `class[].subclasses`——匯入 script 需處理兩種格式差異（見 3.2）
- [x] 0.2 盤點 SRD 5.1 各資料域覆蓋數（實測自 `../5etools-7hd`，並已對照 WotC 官方 SRD 5.1 PDF 原始文件複核，fork 的 `srd` 標記與官方文件一致）：spells **319**（PHB 361 中有標記者；其中 17 筆 `srd` 為字串 = PI 官方改名）、classes **12**、subclasses **12**（每職業 1）、races **9** + SRD 亞種 6（丘陵矮人／高等精靈／岩侏儒／輕足半身人／人類變體／龍裔·提夫林基礎型）、backgrounds **1**（侍僧）、feats **1**（擒抱者）、conditions **15**、items **186** + baseitems **63**、optionalfeatures **49**
- [ ] 0.3 與 in-flight changes（`character-progression`、`class-choice-features`、`level-up-flow`、`active-effects`）定序：確認階段 1 的 `RuleSet` 抽取於哪個時點進行，避免同檔大幅重構互相輾壓

## 1. 階段一：地基（行為不變）

- [ ] 1.1 新增 `lib/features/character/domain/rules/rules_version.dart`：`RulesVersion` enum（`v5r` / `v5e`）、序列化字串（`'5r'` / `'5e'`）、書源解析（`XPHB` / `PHB`）
- [ ] 1.2 新增 `rule_set.dart`：`RuleSet` 抽象介面，涵蓋 design D2 列舉的版本相異項目（種族/職業/背景清單、種族屬性加值、半施法者法術位表、戲法已知數、法術準備模型與數量、子職取得等級、ASI 等級、職業資源規則表、力竭語意、起源專長有無、武器精通有無）
- [ ] 1.3 新增 `rule_set_5r.dart`：把 `character_creation_data.dart`、`character_math.dart`、`class_resources.dart`、`level_up.dart` 中版本相異的常數與函式搬入，原檔保留兩版共用者（`abilityModifier`、`proficiencyBonusFor`、標準陣列與購點表、技能清單、全施法者與契約法術位表、AC 公式、攻擊列推導、貨幣運算）
- [ ] 1.4 新增 `ruleSetProvider = Provider.family<RuleSet, RulesVersion>` 與 `currentRulesVersionProvider`（自 `currentCharacterProvider` 導出，建角流程以 `ProviderScope` override 注入）
- [ ] 1.5 `catalog_repository.dart`：`CatalogRepository` 改由版本解析書源，`catalogRepositoryProvider` 改為 `Provider.family<CatalogRepository, RulesVersion>`；**刪除 `kCatalogSource` 全域常數**
- [ ] 1.6 9 個目錄 provider（species / class / subclass / classFeature / background / feat / spell / entry / item）加上版本維度（無 family 者改 `family<T, RulesVersion>`，已有 family 者 key 改為 record）
- [ ] 1.7 修正 39 處呼叫點（`character_create_page.dart`、`character_level_up_page.dart`、`inventory_tab.dart`、`item_catalog_picker.dart`、`status_section.dart`、`character_header.dart`、`character_sync_repository.dart` 與 2 個測試檔），全數帶入版本
- [ ] 1.8 既有測試改為經 `RuleSet5r` 取值；新增 `rule_set_5r_test.dart` 驗證搬遷後數值與搬遷前完全一致（法術位表、戲法數、備法數、ASI 等級、職業資源逐級比對）
- [ ] 1.9 新增 `catalog_repository_test.dart` 案例：版本解析書源正確、兩版查詢互相獨立
- [ ] 1.10 驗收：`flutter test` 全綠、`flutter analyze` 無告警、App 行為與階段一之前逐項一致（建角、升級、Decision 狀態全文、裝備目錄）

## 2. 階段二：版本骨架（5e 選項仍隱藏）

- [ ] 2.1 `Character` 新增 `rulesVersion`（`@Default('5r')`），欄位註解標明「建立後不可變更」；`freezed`/`json` 重新產生
- [ ] 2.2 `CustomBackground` 新增 `rulesVersion`（`@Default('5r')`）與 5e 專屬欄位（`tools`、`languages`、`featureName`、`featureText`，皆可空）
- [ ] 2.3 建角流程新增「規則版本」為第 0 步；步驟數改為施法 8 / 非施法 7；預設 5r，5e 選項以 gate 隱藏或標示「尚未開放」
- [ ] 2.4 回頭變更版本的確認對話框與重置邏輯（清空種族/職業/背景/能力值/技能/法術，保留名稱、陣營、角色圖）
- [ ] 2.5 建角各步驟改自 `RuleSet` 與版本化 catalog provider 取選項；建角流程以流程本地版本 override `currentRulesVersionProvider`
- [ ] 2.6 角色選擇畫面卡片加規則版本標示（文字標示，非裸符號；缺欄位者顯示 5r）
- [ ] 2.7 角色卡頁首顯示版本（唯讀）；確認全 App 無任何變更版本的寫入路徑
- [ ] 2.8 自訂背景編輯頁：版本唯讀顯示；建角背景清單僅列同版自訂背景
- [ ] 2.9 建角要求連線（design D10）：角色選擇畫面於內容庫不可用時停用「新增角色」入口並說明原因；法術步驟移除「跳過本步驟」路徑，改為阻擋續行 + 重試（先前步驟選擇保留）。確認既有角色的檢視與使用不受影響
- [ ] 2.10 測試：既有無 `rulesVersion` 的角色與自訂背景讀入後為 5r 且行為不變；建角改版本的重置行為；清單徽章顯示；內容庫不可用時建角入口停用與法術步驟阻擋
- [ ] 2.11 驗收：`flutter test` 全綠、`flutter analyze` 無告警；實機確認建角新步驟、清單徽章與離線阻擋（手機與平板版型各一次）

## 3. 階段三：內容層（PHB 資料與政策）

- [ ] 3.1 `import_to_supabase.py`：SRD 過濾標記參數化（`XPHB` → `srd52`、`PHB` → `srd`），並確認重匯其一不影響另一書源
- [ ] 3.2 `import_to_supabase.py` 支援舊版巢狀子職格式（`class[].subclasses`），使 PHB 子職可自 `../5etools-7hd` 匯入（見 0.1）
- [ ] 3.3 分批匯入 PHB（2014）資料（來源簡體，管線 OpenCC 轉繁）：conditions 15 → classes 12/subclasses 12/class_features → races 9（含 SRD 亞種）→ backgrounds 1 → feats 1 → spells 319（含 17 筆 PI 改名採 `srd` 字串值）→ items 186 + baseitems 63 → optionalfeatures 49；每批完成後驗證筆數與 0.2 盤點一致、跨表 `class_id` 關聯完整
- [ ] 3.4 全域驗證：兩書源資料列共存、`srd = false` 查詢為空、`v_spells` / `v_items` 對 PHB 正常、法術的 `classes` 欄位非空（比照 XPHB 匯入時發現的回填問題）
- [ ] 3.5 交叉引用掃描（content-scope「內文交叉引用無失效名稱」）：SRD 5.1 原文保有指向非 SRD 內容的殘留敘述（已知例：野蠻人 Primal Path 內文提及「Path of the Totem Warrior」，但該子職機制不在 SRD），需盤點並確認渲染時不產生指向不存在條目的連結
- [ ] 3.6 更新 `designs/SUPABASE.md`：雙書源說明、匯入過濾規則、兩份 SRD attribution
- [ ] 3.7 App 內授權聲明補上 SRD 5.1 的 CC-BY-4.0 attribution；README 同步
- [ ] 3.8 更新 CLAUDE.md 的 content-scope 段落為雙版政策
- [ ] 3.9 測試 fixtures：新增 PHB conditions 真實快照，驗證 5etools 標記渲染無殘留

## 4. 階段四：5e 規則層與開放

- [ ] 4.1 `rule_set_5e.dart`：種族清單（亞種展平為獨立條目、含 `abilityBonuses`）、職業清單、內建背景清單
- [ ] 4.2 `rule_set_5e.dart`：半施法者法術位表（Lv2 起）、戲法已知數、法術準備模型（`known` / `prepared` 分職業）與 `spellCountFor`（含動態公式：施法屬性調整值 + 職業等級，下限 1）
- [ ] 4.3 `rule_set_5e.dart`：子職取得等級（依職業 Lv1/2/3）、ASI 等級、職業資源規則表（含氣點等 5e 專屬資源）、力竭六級效果表與本地降級摘要
- [ ] 4.4 建角能力值步驟：5e 顯示唯讀種族加值卡（取代 5r 的可互動背景加值卡）；最終值上限 20 的驗算兩版一致
- [ ] 4.5 建角法術步驟：區塊標題依準備模型切換（「已知法術」/「可備法術」）；數量取 `spellCountFor`
- [ ] 4.6 自訂背景編輯頁 5e 表單（技能×2、工具/語言、背景特性），驗證規則與 5r 分離
- [ ] 4.7 升級流程：子職選擇節點依版本浮動、ASI 等級、法術位與法術數、職業資源同步皆走角色自身版本
- [ ] 4.8 Decision 力竭與狀態全文依角色版本解析書源與降級摘要
- [ ] 4.9 測試參數化：規則表比對測試改 table-driven 跑雙版；新增 5e 專屬案例（動態備法數、子職等級、半施法者 Lv1 無法術位、氣點推導）
- [ ] 4.10 開放 5e 選項（移除 gate）；驗收：`flutter test` 全綠、`flutter analyze` 無告警；實機各建一張 5e 與 5r 角色走完建角→升級→Decision 全流程

## 5. 收尾

- [ ] 5.1 檢查 `openspec/specs/` 其他 spec 是否殘留「單一書源 XPHB」「僅 SRD 5.2」「依 D&D 2024 規則」等單版描述需隨 archive 更新
- [ ] 5.2 確認 design Open Questions 皆已結案（fork 資料、5e 專長開關、徽章視覺、5e 升級子職節點）；未結案者轉為新 change 或明確記錄為 Non-Goal
