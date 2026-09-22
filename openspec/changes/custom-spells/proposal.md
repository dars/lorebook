> **⚠️ 事後補寫（2026-09-22）**：本 change 的實作先於 artifacts 完成——程式碼於
> 2026-09-10 前後寫完（migration 檔名時戳 `20260910043545`），但當時沒有走
> propose 流程。背景／種族／子職三個型別都有完整的 proposal＋design＋tasks，
> 法術這批沒有，是紀律上的破口：**開了「這次先寫程式」的例，下一個型別就會
> 照著做**。這裡把當時的判斷與偏離補記下來，不是為了補齊檔案數。
>
> 因此 tasks.md 的勾選是**對既有程式碼的盤點**而非實作紀錄，且明確標出尚未
> 完成的部分（migration 未推、線上未實測）。

## Why

法術是 homebrew 推進順序裡背景／種族／子職之後的下一步（見 `project_homebrew_roadmap`）。SRD 5.2 的法術清單收斂過，而法術是玩家最常自創的內容類型——DM 給的戰役專屬法術、職業變體的替代法術、從非 SRD 來源改寫的效果，目前完全沒有出口：玩家只能寫在筆記欄，法術頁看不到、施法時間與專注旗標也不存在，等於這個法術在 App 裡不算存在。

前三個型別已經把整條路鋪好：文件模式表、zod schema、server actions、`embedded` 模式的管理元件、`/library` 收藏紀錄的區塊化呈現，以及 `lib/homebrew/types.ts` 的 `HOMEBREW_KIND` 註冊表——分享／檢視／收藏三條路徑共用一筆註冊。法術沿用整套，不發明新模式。

法術與前三者有一個結構差異值得先講明：**背景、種族、子職是「建角時選一個」，法術是「隨時往角色裡加很多個」**。前者的消費點在建角與升級流程，後者的消費點在角色卡的法術頁。這決定了本 change 的整合點不在 `create-wizard`（見 design D4）。

## What Changes

- 新增 `user_spells` 表（文件模式，比照 `user_backgrounds`／`user_species`）：客戶端產生 id、提升欄位 `name`、`data jsonb`、LWW `updated_at`、`deleted_at` tombstone、own-row RLS。新表**一開始就採 0007 才補上的形狀**（複合主鍵 `(user_id, id)`、`source_*` 三欄），不重走一次「先做錯再修」
- 新增 `CustomSpell` schema：以角色卡既有的 `Spell` 為基底 `extend`，補上只有自創法術才需要的欄位（`nameEn`、`school`、`duration`、`components`、`ritual`）與長度／範圍界限
- 角色卡的 `Spell` 新增 `homebrewId?` 欄位：標記「這一筆是自創法術的快照」。去重、移除、來源追溯與**規則隔離**都靠它
- 新增自創法術的建立／編輯／刪除介面，置於 `/library` 收藏紀錄（與前三個型別同一頁，不新增路由）
- 角色法術頁新增「從收藏選用法術」：選用即快照進角色，之後編輯或刪除收藏不影響已選用的角色
- **修正既有缺陷**：`lib/rules/ac.ts` 的 `knowsMageArmor` 以英文名比對 `'Mage Armor'`。自創法術若取同一個英文名，會啟用官方法師護甲的 AC 公式——加上 `!s.homebrewId` 條件隔離（見 design D5）
- `HOMEBREW_KINDS` 加入 `'spell'`、註冊表加一筆；migration 一併補 `homebrew_shares` 的 `kind` check 與 `get_shared_homebrew` 的法術分支——0008 當時就預留了「法術解凍後加一支」

## Capabilities

### New Capabilities
- `custom-spells`: 自創法術的建立、編輯、刪除、雲端同步，以及角色卡選用時的快照語意

### Modified Capabilities
- `character-management`: 角色法術頁新增自創法術的選用與移除；法術頁的顯示條件放寬（見 design D3）
- `data-layer`: 新增一張沿用文件模式的使用者自有資料表 `user_spells`

## Impact

**資料層分類**：影響使用者自產內容（homebrew），不觸及靜態內容庫（`v_spells` 的 SRD 法術唯讀、不受影響）與 Campaign 共用資料；無 Realtime 訂閱異動。

- **新資料表 `user_spells`**（App 自有 Supabase 專案）：

  | 欄位 | 型別 | 說明 |
  |---|---|---|
  | `id` | `text` | 客戶端產生（見 design D7） |
  | `user_id` | `uuid not null` | `default auth.uid()`，`references auth.users` |
  | `name` | `text not null default ''` | 清單用提升欄位 |
  | `data` | `jsonb not null` | 完整 `CustomSpell` |
  | `created_at` / `updated_at` | `timestamptz not null` | `updated_at` 由共用 `set_updated_at()` trigger 維護 |
  | `deleted_at` | `timestamptz` | 軟刪除 tombstone |
  | `source_token` / `source_updated_at` / `source_note` | | 收藏他人分享時的副本來歷（比照 0007） |

  主鍵 `(user_id, id)`。RLS 四條 own-row policy、`grant` 限 `authenticated`、`revoke all from anon`。

- **既有物件變更**：`homebrew_shares` 的 `kind` check 加入 `'spell'`；`get_shared_homebrew` 全文重貼並加一支法術分支（`create or replace` 不接受部分更新）。
- **既有表**：`user_characters` 不變（`homebrewId` 存在 `data jsonb` 內，無 schema 變更）。

**程式碼影響**：

- 新增 `next/lib/spells/types.ts`：`CustomSpell` schema、`spellFromCustom()` 快照轉換、`addCustomSpell()`／`removeCustomSpell()` 角色操作
- 新增 `next/lib/spells/actions.ts`：server actions（`fetchCustomSpells`／`upsertCustomSpell`／`deleteCustomSpell`）
- 新增 `next/components/spells/spell-manager.tsx`：收藏紀錄的管理區塊
- 新增 `next/components/spells/spell-picker.tsx`：角色法術頁的選用對話框
- `next/lib/domain/character.ts`：`Spell` 新增 `homebrewId?`
- `next/lib/rules/ac.ts`：`knowsMageArmor` 排除自創法術
- `next/lib/homebrew/types.ts`：註冊表加一筆
- `next/components/homebrew/homebrew-view.tsx`：分享檢視頁的法術內容區塊
- `next/components/character/character-sheet.tsx`／`tabs/rest-tabs.tsx`／`character-sheet-live.tsx`：法術頁的 `tools` 插槽與顯示條件
- `next/app/library/page.tsx`：收藏紀錄新增法術區塊
- `next/components/character/spell-card.tsx`：自創法術的標示與施法資訊行

**版型影響**：管理區塊沿用 `/library` 既有的 `expanded:grid-cols-2` 排列；選用對話框沿用 `EditorSheet`。無新版型分支。

**相依**：無新第三方套件。

**與其他 change 的關係**：

- **`homebrew-share`**：法術自動取得分享／檢視／收藏能力（註冊表驅動）。但該 change 的**階段 8（規則版本）與階段 9（資格判定）整段未實作**，法術同樣沒有——檢視頁不會判斷「你這個職業／等級能不能用這道法術」。這是既有缺口的延續，不是本 change 新增的
- **`dual-rules-version`**：`CustomSpell` 比照 `CustomBackground`／`CustomSpecies` **先不納入 `rulesVersion`**，待該 change 決定 homebrew 的版本策略後四個型別一併處理，避免版本語意分岔
