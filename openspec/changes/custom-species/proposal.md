## Why

SRD 5.2 收斂後內建選項本就不多，種族只有 8 個（人類、精靈、矮人、半身人、龍裔、獸人、提夫林、侏儒）。玩家想扮演 SRD 沒收錄的種族——龍人的變體、自創的族群、DM 為戰役設計的原生種族——目前完全沒有出口，只能挑一個機制相近的內建種族再自己記著「其實我是別的」。

自訂背景（2026-07-10 完成）已經證明這條路走得通：`user_backgrounds` 文件模式、建角選項合併供給、角色快照不回查來源。種族是 homebrew 推進順序的下一步，且 `SpeciesOption` 的欄位本身就是一組現成的規則軌道（速度、體型、黑暗視覺、每級額外 HP、種族技能可選數與來源），照著開選單即可，不需要開放自由填空。

## What Changes

- 新增 `user_species` 表（文件模式，比照 `user_backgrounds`）：客戶端產生 id、提升欄位 `name`、`data jsonb`、LWW `updated_at`、`deleted_at` tombstone、own-row RLS
- 新增自訂種族的建立／編輯／刪除介面，欄位對齊 `SpeciesOption` 的既有軌道：名稱（中文，必填）、英文名（選填）、速度、體型（固定或可選中型／小型）、黑暗視覺、每級額外 HP、種族技能可選數與可選清單、特性條目（名稱 ＋ 說明，沿用 `feature-descriptions` 定義的 `SpeciesTrait`）、敘述
- **所有數值欄位以選單或級距呈現，SHALL NOT 開放任意輸入**：速度自既有級距選、每級額外 HP 限 0–2、技能可選數限 0–2、可選技能自 18 技能勾選
- 建角種族步驟的選項改為「內建 SRD 種族 ＋ 該使用者的自訂種族」合併清單；自訂項以「（自訂）」標識，選取後的敘述卡、體型選擇、種族技能帶入行為與內建一致
- **修正既有缺陷**：`LevelUpPlan.forCharacter` 目前以中文種族名反查 `kSpecies` 取 `hpPerLevel`，自訂種族查不到會回 0，導致每級額外 HP 在升級時靜默消失。改為在建角時把該值**快照進角色**，並對既有角色一次性回填
- 自訂種族的 id 直接採 128-bit 隨機值（沿用 `generateShareToken()`），不重蹈自訂背景時間戳 id 的可枚舉問題

## Capabilities

### New Capabilities
- `custom-species`: 自訂種族的建立、編輯、刪除、雲端同步，以及參與建角的合併供給與快照語意

### Modified Capabilities
- `character-management`: 建角種族步驟的選項來源由固定常數改為「內建 ＋ 自訂」合併；角色快照新增種族每級額外 HP 欄位
- `data-layer`: 新增一張沿用文件模式的使用者自有資料表 `user_species`

## Impact

**資料層分類**：影響「角色卡資料」層旁的使用者自產內容（homebrew），不觸及靜態遊戲資料（內容庫）與 Campaign 共用資料；無 Realtime 訂閱異動。

- **新資料表 `user_species`**（App 自有 Supabase 專案）：
  | 欄位 | 型別 | 說明 |
  |---|---|---|
  | `id` | `text primary key` | 客戶端產生的 128-bit 隨機值 |
  | `user_id` | `uuid not null` | `default auth.uid()`，`references auth.users` |
  | `name` | `text not null default ''` | 清單用提升欄位 |
  | `data` | `jsonb not null` | 完整 `CustomSpecies.toJson()` |
  | `created_at` / `updated_at` | `timestamptz not null` | `updated_at` 由既有 `set_updated_at()` trigger 維護 |
  | `deleted_at` | `timestamptz` | 軟刪除 tombstone |

  RLS：四條 own-row policy（`(select auth.uid()) = user_id`），`grant ... to authenticated`、`revoke all ... from anon`——與 `user_backgrounds` 完全一致。

- **既有表**：`user_characters` 不變（新增的快照欄位存在 `data jsonb` 內，無 schema 變更）。

**程式碼影響**：

- 新增 `lib/features/character/domain/custom_species.dart`（freezed model ＋ `toSpeciesOption()` 轉接）
- 新增 `lib/features/character/data/custom_species_repository.dart` 與 `customSpeciesProvider`
- 新增 `lib/features/character/presentation/custom_species_edit_page.dart` 與路由 `/custom-species-edit`
- `lib/features/character/presentation/character_create_page.dart`：種族步驟的選項合併、自訂項的編輯／刪除入口、「+ 自訂種族」入口；送出時快照 `speciesHpPerLevel`
- `lib/features/character/domain/character.dart`：新增種族每級額外 HP 欄位
- `lib/features/character/domain/level_up.dart`：`forCharacter` 改讀角色快照欄位，不再反查 `kSpecies`
- 新增回填函式（比照 `backfillClassResources`）：既有角色依中文種族名自 `kSpecies` 補齊該欄位，於雲端讀入時套用

**版型影響**：手機與平板皆有。編輯頁沿用自訂背景編輯頁的排列與既有 `ResponsiveLayout` 級距，無新版型分支。

**相依**：無新第三方套件。

- **與 `dual-rules-version` 的關係**：該 change 會引入 `rulesVersion`，而 `CustomBackground` 目前無此欄位。本 change 的 `CustomSpecies` 是否納入版本欄位見 design D6——結論是**先不納入**，待該 change 決定 homebrew 的版本策略後與自訂背景一併處理，避免兩種 homebrew 型別的版本語意分岔。
- **相依 `feature-descriptions`（必須先落地）**：自訂種族的特性為「名稱 ＋ 說明」兩欄，前提是該 change 已把 `SpeciesOption.traits` 結構化為 `SpeciesTrait` 並定義好點擊展開的呈現。本 change 不重複定義特性的形狀與互動。
- **與 `homebrew-share` 的關係**：該 change（未實作）的 `shared_homebrew` 快照表已以 `kind` 欄位設計成可容納後續型別，自訂種族日後要分享**不需再 migration**；本 change 不涉及分享。
