# Design — 升級等級流程（level-up-flow）

## Context

- `character-create` 已完成：引導式建角（動態步驟、法術自內容庫過濾、確認頁建立角色並計算衍生數值），衍生計算目前散在 `character_creation_data.dart` 與 `character_create_page.dart`。
- `Character` 模型已具備升級所需欄位：`level`、`hitDieFaces`、`proficiencyBonus`、`maxHp`、`subclass/subclassEn`、`features`、`spells/cantrips/spellSlots` 等；角色以 `user_characters.data` jsonb 全文件同步（LWW、軟刪除）。
- 內容庫既有查詢已涵蓋升級所需：`fetchClasses()`（`hdFaces`、`spellcastingAbility`、`casterProgression`）、`fetchSubclasses(classId)`、`fetchClassFeatures(classId, {level, isSubclass})`、`fetchSpells({level, className})`。
- 尚無任何升級 UI 與每級法術位表。

## Goals / Non-Goals

**Goals:**

- 單職業、一次一級（Lv1→20 逐級）的引導式升級流程，步驟依「本級事件」動態組成。
- HP（平均值預設／手動輸入骰值）、熟練加值、Lv3 子職、ASI（4/8/12/16/19）、新職業/子職特性、法術位與新法術。
- 衍生數值重算邏輯抽成共用 helper，建角與升級共用一份。
- 內容庫離線時可降級完成升級（本地可算的照常，仰賴內容庫的步驟可跳過）。

**Non-Goals:**

- 多職業（multiclass）、專長（Feats）、降級／復原、App 代擲骰。
- 選項型特性的選擇 UI（專精、超魔法、魔能祈喚、戰技、武器精通等）——見 D8，另立 backlog `class-choice-features`。
- 升級時替換既有法術（2024 允許，但本次只做新增）。
- 能力值因魔法物品/事件的自由編輯（屬 `character-progression` 其餘方向）。
- 法術頁事後自行增刪法術的管理功能（另案）。

## Decisions

### D0. 觸發點：角色頁頁首 LEVEL 徽章 + 確認對話框

升級入口為角色頁頁首右上角的 LEVEL 徽章（共用 `CharacterHeader`）：點擊彈出確認對話框「調升至 Lv N？」，確認才進入 wizard。`CharacterHeader` 同時用於行動頁，點擊觸發僅在角色頁啟用（以參數/當前 destination 控制），避免行動頁誤觸。Lv20 點擊顯示已達上限提示。徽章可點擊時提供視覺提示（觸控目標 ≥ 48dp）。

*替代方案*：總覽頁內另設升級按鈕——LEVEL 徽章本就是等級的視覺焦點，讓入口與資訊同位、不新增版面元素。棄用另設按鈕。

### D1. 流程形式：全螢幕 wizard，步驟依本級事件動態組成

沿用建角頁的模式（單一 page + `_buildStep()` 切換、步驟指示器、responsive 置中限寬）。步驟序列在進入時依「目標等級會發生什麼」決定：

```
HP（每級必有）
→ 子職選擇（僅 Lv3）
→ ASI（僅 Lv4/8/12/16/19）
→ 新特性確認（該級有職業/子職特性時；唯讀瀏覽）
→ 新法術選擇（施法職業且有新戲法/法術可學時）
→ 確認（變更摘要 before → after）
```

*替代方案*：單頁摘要一次完成——資訊密度過高，對非專業玩家不友善，且與建角體驗不一致。棄用。

### D2. 每級規則資料：內容庫為主，法術位表以 `casterProgression` 推標準進程

- 特性、子職、法術清單直接用既有 catalog 查詢（`class_features` 依 classId+level 過濾、`subclasses` 依 classId、`v_spells` 依職業/環數）。
- 各環法術位**不解析** `classes.data` 的 5etools `classTableGroups`（格式因職業而異、解析成本高），改以 `casterProgression`（`full`／`1/2`／`pact` 等）對應**本地常數**的 2024 標準進程表；契約師（pact magic）單獨一張表。
- 已知/可備法術數、戲法數依職業以本地常數表提供（2024 PHB 各職業表），與現行 `ClassOption.level1Slots` 屬同層級的規則常數。

*理由*：法術位進程是規則常數、永不變動，放本地零網路依賴；內容庫負責「內容」（特性文字、法術描述），本地負責「數字表」。

### D3. HP：平均值預設、可切換手動輸入

- 平均值 = `hitDieFaces / 2 + 1`（d6→4、d8→5、d10→6、d12→7）。
- 手動輸入夾在 `1..hitDieFaces`。
- 本級 HP 增量 = 骰值 + CON 修正值，**最低 1**；累加至 `maxHp`，`currentHp` 同步 +增量（升級不回滿血，僅加上限與等量現血）。

### D4. 衍生重算抽出共用 helper：`character_math.dart`

新增 `lib/features/character/domain/character_math.dart`，集中純函式：

- `abilityMod(score)`、`proficiencyBonusFor(level)`（`2 + (level - 1) ~/ 4`）
- 豁免/技能加值、被動察覺、先攻、施法 DC/命中
- `spellSlotsFor(progression, level)`（D2 的進程表）

建角確認頁與升級確認頁都改用這份 helper（建角側僅換算式來源，行為不變）。

### D5. ASI：+2 或 +1/+1，上限 20

- 兩種模式切換（同建角背景加值卡的互動語彙）：+2 單屬性，或 +1/+1 兩個不同屬性。
- 任何屬性經加值後不得超過 20；已達上限的屬性選項停用。
- 能力值變動後，確認頁即時反映所有衍生連動（含 CON 變動時**回溯重算全等級 HP 增量**——2024 規則 CON 修正值提升時，最大 HP 依角色等級每級 +1）。

### D6. 離線降級與 Lv3 子職補選

- 內容庫不可用時：HP、熟練加值、ASI、法術位（本地常數）照常；子職／特性／法術步驟顯示「內容庫離線」提示並允許跳過。
- Lv3 離線跳過子職時 `subclass` 留空；之後角色達 Lv3 以上且子職為空且內容庫可用時，點擊 LEVEL 徽章的確認對話框另提供「補選子職」選項，走單步子職選擇（選完帶入 Lv3 起累積的子職特性）。

### D7. 寫回：wizard 完成時一次 commit

- 流程中所有選擇存於流程本地狀態（同建角），點「完成升級」才組出新 `Character` 交給 `character_providers` 更新，觸發既有 LWW 同步；中途返回/離開不留任何變更。
- 法術位：上限依新表更新，已用數保留（clamp 至新上限）；升級不等於休息。

### D8. 選項型特性：唯讀顯示 + 提示，選擇器另立 backlog

不少職業在特定等級獲得「需玩家做選擇」的特性（遊蕩者/吟遊詩人的專精、術士超魔法、邪術師魔能祈喚、戰鬥大師戰技、武人職業的武器精通調整等）。本次「新特性確認」維持唯讀：這類特性照常列出，卡片上加註「此特性需做選擇，請閱讀說明後自行記錄」，不阻擋流程。

*理由*：通用 choose-N-from-list 選擇器需要逐職業建置結構化選項資料（內容庫 `class_features.data` 為 5etools 原文，選項需另行結構化），工作量與專長（Feats）同量級；缺它不擋升級主流程落地。兩者併入 backlog `class-choice-features` 規劃。

*替代方案*：v1 只做最簡單的專精（選技能加倍）——會開「部分特性有 UI、部分沒有」的不一致體驗，且仍需建選項資料管線。棄用。

### 版型

- compact：單欄 wizard（同建角）；medium/expanded：內容置中限寬。互動元件維持 ≥ 48dp 觸控目標，Material 3 元件語彙與金色/暗黑主題一致。
- 不涉及 Campaign Realtime，無即時回饋需求。

## Risks / Trade-offs

- [內容庫 `class_features` 逐級資料不全或未中文化] → 顯示可得內容（原文 fallback），特性步驟永遠可「確認繼續」，不阻擋升級。
- [選項型特性只有唯讀提示，玩家選擇無處記錄] → 提示引導玩家自行記錄（如角色筆記）；`class-choice-features` backlog 落地後補上選擇器並回填既有角色。
- [各職業已知法術/可備數規則差異大（如術士已知 vs 牧師全備）] → 本地常數表按職業建模為「本級可新選 N 個」的差額；首版以 2024 PHB 表為準，特例（如替換既有法術）不做，僅新增。
- [CON 提升回溯重算 HP 與歷史手動骰值] → 不保存逐級骰值歷史，回溯部分只重算 CON 修正差額（`Δmod × level`），數學上等價且無需新欄位。
- [LWW 覆蓋：多裝置同時升級] → 沿用既有文件層級 LWW，不新增合併邏輯；風險與現行編輯一致。
- [一次要升多級（補記）] → 一次一級，完成後可立即再進流程；不做批次升級。

## Migration Plan

無資料遷移：不改 `user_characters` schema、不動內容庫表。舊資料（`subclass` 為空的 Lv3+ 角色）由 D6 的補選入口自然涵蓋。可獨立上線、隨時回退（僅新增 UI 與純函式）。

## Open Questions

- ~~內容庫 `classes.caster_progression` 的實際值域需確認~~ **已確認（2026-07-04 dev 資料）**：值域為 `full`（Bard/Cleric/Druid/Sorcerer/Wizard…）、`1/2`（Paladin/Ranger）、`pact`（Warlock）、`artificer`／`1/3`（Artificer，非本 app 職業）、`null`（非施法）。本 app 12 職業全數落在 `casterProgressionFromString` 已涵蓋的值；`1/3` 落非施法 fallback，符合設計。
