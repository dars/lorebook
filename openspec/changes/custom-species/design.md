## Context

種族在建角流程裡由 `SpeciesOption`（`character_creation_data.dart:73`）描述，`kSpecies` 是寫死的 8 個 SRD 種族。這個型別的欄位本身就是一組**已經收斂過的規則軌道**：

| 欄位 | 型別 | 現況取值 |
|---|---|---|
| `cn` / `en` | String | 中英名 |
| `speed` | String | 全部為 `'30ft'` |
| `size` | String | `'Medium'`／`'Small'`（半身人、侏儒為 Small） |
| `darkvision` | bool | 8 個裡 6 個為 true |
| `hpPerLevel` | int | 僅矮人為 1，其餘 0 |
| `skillPickCount` | int | 人類、精靈為 1，其餘 0 |
| `skillPickFrom` | List\<String\> | 人類為全 18 技能、精靈為洞察／感知／求生 |
| `sizeChoices` | List\<String\> | 人類與提夫林可選 Medium／Small |
| `traits` | List\<String\> | 純顯示文字，標題與摘要黏成一串，如 `'矮人堅毅 +1HP/級'` |
| `description` | String | 佔位文案 |

三個消費點：

1. **建角步驟 2**（`character_create_page.dart:584-620`）：以 `s.cn` 產生選單，選取後 `kSpecies.firstWhere((s) => s.cn == cn)`；有多個體型時顯示選擇列；敘述卡顯示速度／體型／黑暗視覺與 traits
2. **建角送出**（同檔 380-400）：`sp.cn`／`sp.en` 寫入 `Character.species`／`speciesEn`，`size` 取 `_sizeChoice ?? sp.size`，`speed` 取 `sp.speed`，種族技能併入 `profSkills`
3. **升級**（`level_up.dart:82`）：`kSpecies.where((s) => s.cn == c.species)` 反查取 `hpPerLevel`

第 3 點是既有缺陷，見 D3。

自訂背景（archived `2026-07-10-custom-backgrounds`）已建立完整的 homebrew 模式：`user_backgrounds` 文件模式表、`CustomBackground` freezed model ＋ `toBackgroundOption()` 轉接、repository ＋ Notifier、獨立編輯頁與路由、建角步驟的合併供給與「（自訂）」標識。本 change 沿用整套，不發明新模式。

## Goals / Non-Goals

**Goals:**

- 玩家能建立 SRD 沒收錄的種族並用它建角，機制欄位走既有軌道而非自由填空
- 自訂種族在建角流程中的行為與內建種族**完全一致**（敘述卡、體型選擇、種族技能帶入）
- 角色卡維持快照語意：建角後刪改自訂種族不影響既有角色
- 順手修掉「自訂種族的每級額外 HP 在升級時消失」這個一旦上線就會產生錯誤角色的缺陷

**Non-Goals:**

- **自訂專長**：見 D7，範圍上刻意排除
- **特性的結構化與呈現**：歸 `feature-descriptions`（見 D4d）；本 change 只是使用其定義的型別
- **特性的機制自動化**：說明仍為顯示文字，不做規則引擎
- **修改既有 8 個 SRD 種族**：內建清單唯讀
- **子種族／血系的結構化**（精靈血系、龍族血統、侏儒血系）：SRD 用 traits 文字表達，本版沿用
- **種族分享**：歸 `homebrew-share`
- **能力值加值**：2024 規則的能力值加值來自背景而非種族，因此自訂種族沒有這個欄位

## Decisions

### D1：欄位即軌道——所有數值以選單或級距呈現

自訂種族的每個機制欄位都對應 `SpeciesOption` 的既有欄位，且以受限的輸入元件呈現：

| 欄位 | 輸入方式 | 界限 |
|---|---|---|
| 名稱（中文） | 文字 | 必填、去空白後非空、長度上限 |
| 英文名 | 文字 | 選填 |
| 速度 | 選單 | `20ft` / `25ft` / `30ft` / `35ft` / `40ft` |
| 體型 | 三選一 | 固定中型／固定小型／可選中型或小型 |
| 黑暗視覺 | 選單 | 無 / 60ft / 120ft（距離即單一來源，特性條目由其推導；見 `feature-descriptions` D1a） |
| 每級額外 HP | 選單 | 0 / 1 / 2 |
| 種族技能可選數 | 選單 | 0 / 1 / 2 |
| 可選技能來源 | 多選 | 自 18 技能勾選；可選數 > 0 時至少須勾選可選數 ＋ 1 個 |
| 特性 | 條目（名稱 ＋ 說明兩欄） | 各自的長度上限、條目數上限；型別由 `feature-descriptions` 定義，見 D4d |
| 敘述 | 多行文字 | 選填、長度上限 |

- **為什麼不開放任意數值**：開放輸入的瞬間，App 就得回答「速度 500ft 合不合法」這種問題。給軌道則驗證只需管結構（見 D2），且產出的資料保證能被既有的建角與升級邏輯消化。
- 速度級距涵蓋 SRD 常見值（小型種族 25ft 到快速種族 40ft），全部是 5 的倍數。
- 每級額外 HP 上限 2：SRD 只有矮人的 1，留 2 的空間給「更堅韌」的自創種族，但不開到會明顯破壞 HP 曲線的程度。

### D2：驗證管結構，不管平衡

儲存前 SHALL 驗證：名稱非空、速度為級距內的值、體型為三種模式之一、每級額外 HP 與技能可選數在範圍內、可選技能皆為合法技能名、可選技能數量足以支撐可選數。

SHALL NOT 驗證：這個種族是否過強、traits 的文字是否描述了不合理的能力。

- **理由**：平衡是 DM 的職權，不是 App 的。App 的責任是「產生的資料結構不會讓程式壞掉」，這條線清楚且可測；一旦開始判斷平衡就得維護一套沒有客觀標準的規則，而且會擋掉使用者刻意要的東西（低魔戰役的弱化種族、史詩戰役的強化種族）。
- 這與自訂背景的既有規格一致。

### D3：每級額外 HP 快照進角色，升級不再反查種族清單

`LevelUpPlan.forCharacter` 目前這樣取值：

```dart
final species = kSpecies.where((s) => s.cn == c.species).toList();
// ...
speciesHpPerLevel: species.isEmpty ? 0 : species.first.hpPerLevel,
```

自訂種族不在 `kSpecies` 裡 → `species.isEmpty` → **回 0**。矮人式的「每級 +1 HP」對自訂種族會在升級時靜默消失，而且角色主人不會收到任何提示。

改為：`Character` 新增 `speciesHpPerLevel` 欄位，建角時自所選種族（內建或自訂）寫入；`forCharacter` 直接讀該欄位。

- **為什麼是快照而不是查表**：整個專案的角色卡都是建卡時快照（背景、職業特性皆然），刪改自訂種族不影響既有角色。若改成升級時反查自訂種族清單，會出現「使用者把自訂種族的 HP 從 1 改成 2，既有角色下次升級突然變壯」，語意混亂；而且未登入時查不到自訂清單，升級行為會依連線狀態而異。
- **既有角色的回填**：新增一次性回填函式，依中文種族名自 `kSpecies` 補齊此欄位，於雲端讀入時與 `migrateLegacyWeapons`、`backfillClassResources` 同一條鏈套用。既有角色全是內建種族，名稱一定查得到；查不到則回 0（與現況行為相同，不會更糟）。
- **這個修正對內建種族也有價值**：升級邏輯不再依賴「角色的中文種族名必須與常數清單一字不差」這個脆弱前提。

### D4：合併供給，且自訂種族的行為與內建完全一致

建角種族步驟的選項為「`kSpecies` ＋ 該使用者的自訂種族」，自訂項以「名稱（自訂）」標識。選取自訂種族後：敘述卡、體型選擇列、種族技能勾選、送出時寫入角色的欄位，全部與內建走同一段程式碼。

實作手段是 `CustomSpecies.toSpeciesOption()` 轉接——與 `CustomBackground.toBackgroundOption()` 同一招。建角流程只認得 `SpeciesOption`，不需要知道它從哪來。

- **好處**：新增自訂種族**不會**在建角流程裡長出第二條分支，行為一致是型別保證的而不是靠測試盯著。
- `en` 留空的處理比照自訂背景：角色快照的 `speciesEn` 為空字串。

### D4d：特性的形狀與互動由 `feature-descriptions` 定義

種族特性的結構化（`SpeciesTrait`：名稱／英文名／說明）、內建種族說明的補齊、以及「清單只顯示名稱、點擊出說明」的呈現，全部屬於 `feature-descriptions` change，**本 change 不重複定義**。

- **為什麼切開**：那些改動觸及內建 8 個種族的常數與既有的傳記頁（連職業特性的呈現一起改），與「新增自訂種族」是不同性質的工作。綁在一起會讓本 change 的風險被無關的改動放大，回退時也分不開。
- **相依方向**：`feature-descriptions` 先落地，本 change 才有 `SpeciesTrait` 可用。自訂種族編輯頁的特性輸入為「名稱＋說明」兩欄，直接沿用該型別。
- 自訂種族的說明由使用者自行填寫，沒有內容庫可查——這是 homebrew 的本質，不是缺陷。

### D5：離線與未登入的降級

自訂種族存在雲端，未登入或離線時取不到。此時種族步驟 SHALL 顯示內建 8 個種族並提示自訂種族離線不可用，**建角流程不被阻擋**。

- 與自訂背景的既有規格一致（「顯示內建 4 個背景與『自訂背景離線不可用』提示，建角流程不被阻擋」）。
- 訪客試玩模式同理。

### D6：首版不納入 `rulesVersion`

`CustomSpecies` 暫不加規則版本欄位，與 `CustomBackground` 的現況保持一致。

- **理由**：`dual-rules-version` 是進行中的 change，homebrew 的版本策略應該由它一次決定並同時套用到背景與種族。若本 change 先自行加一個欄位，會出現兩種 homebrew 型別的版本語意分岔，之後反而要多做一次收斂。
- **可逆性**：文件模式（`data jsonb`）新增欄位不需要 migration，屆時補上即可。

### D7：不做自訂專長——這是刻意的範圍切割

專長在 App 裡目前只是字串：`kOriginFeatChoices` 六個選項、`BackgroundOption.originFeat` 一個字串欄位。內容庫雖有 `feats` 表與 `featCatalogProvider`，但**全 App 無人消費**；升級的 ASI 等級只能加能力值，沒有 2024 規則裡「ASI 或專長二選一」的選項。

因此「自訂專長」現在唯一的落點是自訂背景的起源專長下拉選單——做出來也只是多了一個字串選項，使用者拿不到任何機制。要讓它有意義，得先補上專長系統本身（ASI 換專長、專長清單消費內容庫、專長的先決條件檢查），那是**規則功能的缺口**而非 homebrew 需求，混在一起會讓本 change 的範圍與風險都失控。

- 專長另案處理；順序上應該是「先補專長系統，再談自訂專長」。

### D8：id 直接用隨機值

新建的自訂種族 id 以 `generateShareToken()`（128-bit 隨機、base64url 22 字元，`lib/shared/util/random_token.dart`）產生。

- 自訂背景當初用 `DateTime.now().microsecondsSinceEpoch`，時間戳可枚舉；`homebrew-share` 的 design 已認定這是不該存在的問題。新型別沒有相容包袱，直接做對。
- id 僅為識別，不參與任何權限判斷；即便如此，可枚舉的識別碼本身就沒有存在的理由。

## Risks / Trade-offs

- **軌道限制擋掉使用者想要的種族**：例如飛行速度、游泳速度、抗性、天生法術——SRD 種族有這些（龍裔吐息、提夫林奇術），但都以 traits 文字表達。→ 自訂種族同樣可以寫進 traits，只是不會有機制效果。這與「特性先當顯示文字」的既定原則一致；若日後要結構化，是獨立的一步。

- **traits 為不可信文字**：使用者可寫任意內容（名稱與說明皆是）。→ 一律以純文字呈現，不進入 5etools 標記渲染路徑（與 `homebrew-share` 對外來字串的處理同一原則）；長度與條目數設上限。

- **相依 `feature-descriptions` 的排序**：該 change 未落地前，本 change 沒有 `SpeciesTrait` 可用。→ 實作順序上必須排在其後；兩者的規格已切乾淨，不重疊。

- **快照造成的「改了卻沒變」**：使用者修改自訂種族後，發現既有角色沒跟著變。→ 這是刻意的語意（D3），與自訂背景一致。編輯頁 SHALL 明示「修改不影響已建立的角色」。

- **回填的覆蓋面**：既有角色的 `speciesHpPerLevel` 靠中文種族名反查。若某角色的種族名曾被手動改過（App 目前不提供此操作，但資料層不擋），會回填成 0。→ 與現況行為相同，不構成退步。

- **與 `dual-rules-version` 的排序**：若該 change 先落地並為 homebrew 定義了版本欄位，本 change 的 `CustomSpecies` 需補上。→ 文件模式加欄位無需 migration，成本低；D6 已說明取捨。

## Migration Plan

**新增**：一支 migration 建立 `user_species` 表、索引與四條 own-row RLS 政策，並複用既有的 `set_updated_at()` trigger。純新增，不動既有表。

**既有資料**：`user_characters` 無 schema 變更（新欄位在 `data jsonb` 內）。既有角色於雲端讀入時由回填函式補齊 `speciesHpPerLevel`，不需要資料遷移作業。

**Rollback**：
- App 端：回退版本，自訂種族入口消失；已用自訂種族建立的角色**仍可正常使用**（快照語意，角色不回查來源）
- 資料庫：`drop table public.user_species`（僅影響自訂種族清單，既有角色不受影響）
- 單向門：無。

## Open Questions

1. 速度級距是否需要涵蓋 45ft 以上？SRD 內沒有，但自創種族可能想要。傾向先給 20–40ft，有需求再加。
2. 特性（traits）條目數上限設多少？內建種族最多 4 條，傾向上限 8 條。
3. 自訂種族的管理入口除了建角流程內，是否需要在系統設定頁提供一個總覽清單？自訂背景目前也只有建角流程內的入口，傾向維持一致，待兩種型別都成熟後再一併考慮。
