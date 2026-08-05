## Context

App 現況為單一規則版本（D&D 2024 / 5r），版本假設散落在三個層次：

1. **內容庫書源**：`catalog_repository.dart:12` 的全域常數 `kCatalogSource = 'XPHB'`，其下 9 個目錄 provider（species / class / subclass / classFeature / background / feat / spell / entry / item）皆為無版本維度的 `Provider` / `FutureProvider.family`（family key 目前只有 classId、環數等業務參數）。全 repo 39 處呼叫點。
2. **本地權威表**：`character_creation_data.dart`（`kSpecies` / `kClasses` / `kBackgrounds`）、`character_math.dart`（法術位表、戲法數、可備法術數）、`class_resources.dart`（`kClassResourceRules`）、`level_up.dart`（ASI 等級、子職固定 Lv3）。建角流程的核心選單讀的是**本地表**而非內容庫（內容庫只補描述文字、職業特性、法術清單），這是離線可建角的原因，也表示雙版必須各有一份本地表。
3. **UI 流程**：`character_create_page.dart`（2678 行，步驟清單已依施法職業動態決定）、`character_level_up_page.dart`（1667 行）。

關於離線建角的精確現況：本地表讓**規則數值**在離線時仍算得出來（種族/職業/背景選單、法術位、HP/AC 等衍生值），但**內容欄位會缺**——法術清單為空（法術步驟可跳過）、1 級職業特性略過（`character_create_page.dart:332`）。其中職業特性與職業資源有讀入回填機制（`class_feature_backfill.dart`、`backfillClassResources`），法術清單無回填（屬玩家選擇非推導結果）。

需區分兩件常被混談的事：**未登入 ≠ 內容庫不可用**。內容庫為公開唯讀（anon key、RLS `using (true)`），訪客試玩模式（`guest_mode.dart`）只要有網路即可查得法術與職業特性，僅自訂背景（`user_backgrounds`，RLS 綁 `user_id`）需登入。真正的內容庫不可用只有三種：build 未帶 env（`main.dart` 的 `_supabaseUrl` 為空）、`Supabase.initialize` 失敗、查詢當下無網路。

儲存面的現況對本 change 有利：`user_characters` 與 `user_backgrounds` 皆為 `data jsonb` 整份文件，且 `CharacterSyncRepository.fetchAll()` 是 `select('data')`，新增欄位不需 schema migration，清單徽章也不需新增提升欄位。

前一次規則版本切換（archive `2026-07-09-rules-core-2024-5r`）是**取代**而非並存：它把內容庫的 PHB（2014）列全數刪除，並在 `content-scope` spec 寫入「PHB 書源列 SHALL 刪除」。本 change 需撤銷該要求。

## Goals / Non-Goals

**Goals:**

- 規則版本成為角色的一級屬性，在建角最初決定、建立後不可變更
- 版本解析集中於單一入口：由版本同時決定「本地權威表」與「內容庫書源」，程式其他地方不得再出現書源字面值或版本判斷散落
- 5e 與 5r 的規則差異一律**資料化**（不同的 `RuleSet` 實作），UI 只允許「步驟是否存在」層級的分支
- 既有 5r 角色與自訂背景零遷移、行為完全不變
- 分階段可交付：地基階段不改變任何行為，5e 選項在內容就緒前可被 gate 隱藏

**Non-Goals:**

- **版本轉換**：不提供任何 5e ↔ 5r 的角色轉換路徑（含匯入匯出繞道）
- **多重職業（multiclass）**：兩版皆不在本 change 範圍（App 現況即為單職業）
- **通用規則引擎**：延續既有哲學（見 `class_resources.dart`、`featureArmorViolation`），以固定清單表達規則，不做條件式引擎
- **5e 選用規則**：技能骰變體、5e 的「專長為選用規則」開關等不做，5e 一律視為「啟用專長」
- **同一角色跨版混用內容**（如 5r 角色查 5e 法術）

## Decisions

### D1：版本識別碼為規則語意，非書源代碼

`enum RulesVersion { v5r, v5e }`，序列化為字串 `'5r'` / `'5e'`，存於 `Character.rulesVersion` 與 `CustomBackground.rulesVersion`，皆 `@Default('5r')`。

書源代碼（`XPHB` / `PHB`）是內容庫實作細節，**只在單一映射點**（`RuleSet.catalogSource`）出現。

- **替代方案**：直接用書源代碼當版本識別。**否決**——本地權威表與書源沒有必然一對一關係（未來若有第三方內容源會綁死），且 UI 要顯示「5e / 5r」而非「PHB / XPHB」。

### D2：`RuleSet` 的邊界——只收版本相異者

新增 `lib/features/character/domain/rules/` 目錄，`RuleSet` 抽象介面 + `RuleSet5r` / `RuleSet5e` 兩個實作。

**進 `RuleSet`（兩版相異）**：種族/職業/背景清單、種族屬性加值、半施法者法術位表、戲法已知數、法術準備模型與數量、子職取得等級、ASI 等級、職業資源規則表、力竭語意、起源專長有無、武器精通有無。

**留在既有共用位置（兩版相同，不動）**：`abilityModifier`、`proficiencyBonusFor`、標準陣列與購點表、技能清單、全施法者法術位表、契約法術表、護甲 AC 公式與 `computeAc`、攻擊列推導、徒手攻擊、貨幣運算。

- **理由**：把相同的東西也搬進 `RuleSet` 會製造兩份需同步維護的重複資料，是後續 bug 的主要來源。邊界以「規則書實際有差異」為準，不以「看起來像規則」為準。

### D3：`RuleSet` 經 Riverpod 取得，catalog provider 加版本維度

- `currentRulesVersionProvider`：角色卡情境下由 `currentCharacterProvider` 導出；建角流程中由流程本地 state 提供（此時尚無角色），以 `ProviderScope` override 注入
- `ruleSetProvider = Provider.family<RuleSet, RulesVersion>`
- `catalogRepositoryProvider` 改為 `Provider.family<CatalogRepository, RulesVersion>`；其下 9 個目錄 provider 的 family key 增加版本維度（原本無 family 者改為 `family<T, RulesVersion>`，原本已有 family 者 key 改為 record）
- **刪除 `kCatalogSource` 全域常數**，讓 39 處呼叫點在編譯期報錯，避免漏改

- **替代方案 A**：全域可變的「當前版本」單例。**否決**——多角色切換、建角流程與角色卡並存時會讀到髒值。
- **替代方案 B**：`RuleSet` 存進 `Character`。**否決**——規則表是程式資產不是使用者資料，塞進 jsonb 會讓角色文件膨脹且版本升級時無法修正。

### D4：法術準備模型以「模型 + 數量函式」表達，不動 `Character` 儲存結構

5e 有兩種 spellcasting 模型（Bard/Sorcerer/Ranger/Warlock 為 spells known 靜態表；Cleric/Druid/Paladin/Wizard 為 prepared = 施法屬性調整值 + 職業等級，動態公式），5r 統一為 prepared 靜態表。

`RuleSet` 提供：
- `spellPreparationModel(classEn) → known | prepared`
- `spellCountFor(classEn, level, spellAbilityMod) → int`（5r 忽略 `spellAbilityMod`）

`Character.spells` / `cantrips` 清單結構**不變**，只是「應有幾個」的來源不同。UI 文案依模型切換（「已知法術」/「可備法術」）。

- **理由**：避免動 jsonb 結構，既有角色零遷移；同時容納動態公式，不需為 5e 硬造一張假的靜態表。

### D5：5e 亞種（subrace）以展平處理，不新增兩層模型

SRD 5.1 的亞種（高等精靈、丘陵矮人…）在 `RuleSet5e.species` 中**各自成為獨立的 `SpeciesOption` 條目**（如 `cn: '高等精靈'`），而非在 `SpeciesOption` 上加一層 subrace 結構。

- **理由**：`Character.species` 是單一字串欄位，展平後零結構變更；SRD 5.1 的亞種數量有限，清單長度可接受；建角 UI 不需新增第二層選單。
- **Trade-off**：種族清單變長、同族亞種的共同特性文字會重複；若日後亞種數量暴增再重構為兩層。

`SpeciesOption` 新增 `abilityBonuses`（`Map<String,int>`，5r 一律空），能力值步驟依此決定是否顯示「種族加值」卡（5r 顯示背景加值卡，5e 顯示種族加值卡）。

### D6：版本為建角第 0 步；回頭改版本需確認並重置後續選擇

步驟清單變為：`規則版本 → 基本 → 職業 → 背景 → 能力值 → 技能 →〔施法職業〕法術 → 確認`。

回到版本步驟並更改選擇時，SHALL 彈出確認對話框；確認後重置種族/職業/背景/能力值/技能/法術全部選擇，**保留**名稱、陣營與已選角色圖（與規則無關）。

- **替代方案**：改版本時不重置、盡力沿用同名選項。**否決**——兩版的種族/背景清單與屬性加值來源不同，沿用會產出規則上不成立的角色，且錯誤難以察覺。

### D7：不可變更以「無寫入路徑」落實

`rulesVersion` 於建角完成後無任何 UI 寫入路徑；角色卡以唯讀徽章呈現；升級流程一律讀角色自身的版本。Dart 的 `copyWith` 無法在型別層阻擋，故以 spec 場景 + code review 保障，並於 `Character` 欄位註解標明「建立後不可變更」。

### D8：`CustomBackground` 採單一 model + 版本專屬 nullable 欄位

新增 `rulesVersion`；5r 欄位（`abilities`、`originFeat`）與 5e 欄位（`tools`、`languages`、`featureName`、`featureText`）並存，非該版欄位留空。編輯表單依版本顯示不同欄位組。既有列讀入時預設 `'5r'`（jsonb 儲存，**無 migration**）。

- **替代方案**：`sealed class` 兩型 union。**否決**——會使 repository、清單、建角合併清單三處都要分型處理，收益不抵成本。

### D9：內容庫只新增 PHB 列，不動 XPHB

匯入管線的 SRD 過濾標記參數化（`5r` → `srd52`、`5e` → `srd`），`import_to_supabase.py` 依目標版本切換。內容庫既有 XPHB 列完全不動，新增 `source = 'PHB'` 列，無新表、RLS 沿用。

`content-scope` spec 中「PHB(2014) 書源列 SHALL 刪除」的要求須撤銷，並補上 SRD 5.1 的 CC-BY-4.0 attribution（SRD 5.1 自 2023-01 起同樣為 CC-BY-4.0 授權）。

### D10：建角要求內容庫可用，角色卡使用維持完全離線

內容庫不可用時停用「新增角色」入口；已在流程中則於法術步驟阻擋續行（移除現行的「跳過本步驟」）。既有角色的檢視與使用（Decision 頁、HP／資源管理、物品欄）不受限制。

- **理由**：建角是一次性動作，通常不在牌桌上進行；而殘缺卡片的後果會跟著角色一輩子——法術清單沒有回填機制（屬玩家選擇非推導結果），使用者往往不會察覺自己的角色少了東西。牌桌上真正需要的離線能力是角色卡的**使用**，那部分完全不受影響。
- **附帶效益**：少掉一整類降級分支；也避免 5e 開放初期（內容庫資料若有缺漏）產出「數值正確、法術與特性全空」的空殼角色。
- **替代方案 A**：維持現行可跳過的降級路徑。**否決**——理由如上。
- **替代方案 B**：把 SRD 內容打包進 App 或做完整本機快取，使離線建角完整。**否決（非本 change 範圍）**——需處理資產體積、更新機制與雙版各一份，工程量與本 change 相當且相互獨立；若日後有需求應獨立提案。

### D11：四階段交付，每階段可獨立上線

1. **地基**：`RuleSet` 抽取 + catalog provider 版本化 + `kCatalogSource` 退場。**行為完全不變**，只有 `RuleSet5r` 一個實作，測試全綠即為驗收。
2. **版本骨架**：`Character.rulesVersion`、建角第 0 步、角色清單徽章、`CustomBackground.rulesVersion`。此時 5e 選項以 gate 隱藏或標示「尚未開放」。
3. **內容層**：內容庫灌 PHB 資料、匯入管線分版、spec 改寫、App 內授權聲明。
4. **5e 規則層**：`RuleSet5e` 完整實作（本地表、法術模型、子職等級、職業資源、力竭）、建角/升級的 5e 分支、開放 5e 選項。

## Risks / Trade-offs

- **建角/升級頁淪為條件地獄**（兩個檔合計 4300+ 行）→ 硬性約束：版本差異一律經 `RuleSet` 資料化，UI 只允許「步驟是否存在」與「哪張加值卡」兩種分支；code review 以此為準駁回散落的 `if (version == ...)`。
- **39 處 catalog 呼叫點機械化改動易漏** → 直接刪除 `kCatalogSource` 常數，使遺漏處編譯失敗而非執行期靜默查錯書源。
- **測試量翻倍** → 規則表比對測試改為 table-driven，同一組斷言以版本參數化跑兩次；純數學測試（兩版相同者）維持單版。
- **SRD 5.1 覆蓋比 SRD 5.2 更窄，且窄得不對稱**（實測見 tasks 0.2）：背景**僅 1 個**（侍僧）、專長**僅 1 個**（擒抱者），對照 5r 的 4 背景 / 17 專長。子職每職業 1 個、種族 9 + 亞種 6，與 5r 同級。→ 影響最大的是**背景步驟只有一個選項**，形同無選擇。緩解：自訂背景（homebrew）本就存在且本 change 已使其綁版本，5e 使用者實質靠自訂背景補足；版本選擇步驟 SHALL 明示各版可用選項數量，避免建到一半才發現。專長影響較小（5e 專長本為選用規則，且現行升級流程對專長僅加註提示、未提供選擇 UI）。
- ~~5e 資料翻譯成本未知~~ → **已結案**：資料與翻譯皆已存在（見 Open Questions 1），階段 3 為管線調整與匯入驗證。
- **與 in-flight changes 衝突**（`character-progression`、`class-choice-features`、`level-up-flow`、`active-effects` 皆觸及升級流程與職業資源）→ 階段 1 的 `RuleSet` 抽取應在這些 change 落地後再進行，或反之明確定序，避免同檔大幅重構互相輾壓。

## Migration Plan

**資料遷移**：無。`Character` 與 `CustomBackground` 皆存於 `data jsonb`，新欄位以 `@Default('5r')` 讀入既有文件；`user_characters` / `user_backgrounds` 無 schema 或 RLS 異動。

**內容庫**：僅新增 `source = 'PHB'` 列，既有 XPHB 列不動，屬可加性變更。

**Rollback**：
- 階段 1–2：純 App 端，回退版本即可；已寫入的 `rulesVersion: '5r'` 對舊版 App 為未知欄位，freezed 反序列化忽略之，不會壞卡。
- 階段 3：內容庫的 PHB 列可整批刪除回到現況（fork 原始資料保留）。
- 階段 4：若 5e 已開放後需回退，已建立的 5e 角色會失去正確規則來源——因此**階段 4 上線前需確認階段 3 資料完整**，此為單向門。

## Open Questions

1. ~~**`../5etools` fork 的 PHB（2014）繁中資料是否仍在？**~~ **已結案（tasks 0.1）**：資料完整存在，當初清除的是內容庫資料列而非 fork 原始檔，**不需重新翻譯**。缺口僅有現行 fork 的 `subclass` 陣列已被 XPHB 覆蓋，PHB 子職改自舊 fork `../5etools-7hd` 取得（舊版巢狀格式，匯入 script 需相容）。階段 3 因此降為「管線調整 + 匯入驗證」而非翻譯工程。
2. 5e 的「專長為選用規則」是否要提供開關？現行決定為一律啟用（Non-Goal），但若使用者反映，需回頭補一個角色層級旗標。
3. 版本徽章的視覺樣式（角色清單卡片與角色卡頁首）待設計確認；需符合既有「文字＋數值」而非裸符號的標示慣例。
4. 階段 4 的 5e 升級流程是否沿用現行「一次一級」模型？5e 子職取得等級依職業不同（Lv1/2/3），需確認升級頁的子職選擇節點如何依版本浮動。
