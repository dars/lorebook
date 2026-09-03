> **相依**：本 change 需在 `feature-descriptions` 落地之後實作（特性的 `SpeciesTrait` 型別由該 change 定義）。

## 1. 資料庫（需 migration ＋ 新 RLS 政策）

- [ ] 1.1 新增 migration `0006_user_species.sql`：建立 `public.user_species`（`id text primary key`、`user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`、`name text not null default ''`、`data jsonb not null`、`created_at`／`updated_at timestamptz not null default now()`、`deleted_at timestamptz`），欄位與註解比照 `0004_user_backgrounds.sql`
- [ ] 1.2 同 migration 建立索引 `(user_id)`，並複用既有 `public.set_updated_at()` 建 `before update` trigger
- [ ] 1.3 同 migration 設定 RLS：四條 own-row policy（select／insert／update／delete 皆 `(select auth.uid()) = user_id`）、`grant ... to authenticated`、`revoke all ... from anon`
- [ ] 1.4 以 Supabase CLI 套用至 dev 專案，並以 anon key 驗證查不到任何列

## 2. Domain 與 Repository（依賴 1）

- [ ] 2.1 新增 `next/lib/species/types.ts`：zod schema `CustomSpecies`（id、name、nameEn、speed、sizeMode、darkvisionFt、hpPerLevel、skillPickCount、skillPickFrom、traits（`SpeciesTrait[]`）、abilities（見 D9）、description）＋ `toSpeciesOption()` 轉接（`en` 留空時角色快照的 `speciesEn` 為空字串），比照 `lib/backgrounds/types.ts`
- [ ] 2.2 於同檔定義軌道常數：速度級距（20/25/30/35/40 ft）、體型模式列舉（固定中型／固定小型／可選）、每級額外 HP 與技能可選數的合法範圍、traits 條目數與長度上限、**有限次數能力的次數選項（1/2/3/熟練加值）與回復時機（短休／長休）**
- [ ] 2.3 於同檔加入 `isValid` 驗證（結構合法性：名稱非空、速度屬級距、數值在範圍、可選技能皆為 `SKILLS` 內的名稱、可選技能數 ≥ 可選數＋1、**每則有限次數能力的名稱非空且次數／回復時機為合法值**）；**不驗證平衡**
- [ ] 2.4 新增 `next/lib/species/actions.ts`：server actions `fetchAll`（過濾 tombstone、依 `created_at` 升冪）、`upsert`（送出提升欄位 `name` 與完整 `data`）、`softDelete`；未登入的行為比照 `lib/backgrounds/actions.ts`
- [ ] 2.5 `next/lib/homebrew/types.ts`：`HOMEBREW_KINDS` 加入 `'species'`、`HOMEBREW_KIND` 註冊表加一筆（`label: '種族'`、`table: 'user_species'`、`schema: CustomSpecies`、`columns`）——分享／檢視／收藏三條路徑因此自動支援

## 3. 角色快照與升級修正（依賴 2.1；可與 4 並行）

- [ ] 3.1 `next/lib/domain/character.ts` 新增 `speciesHpPerLevel` 欄位（`z.number().int().default(0)`）
- [ ] 3.2 `next/components/level-up/level-up-view.tsx:63` 改讀 `initial.speciesHpPerLevel`，移除 `SPECIES.find((s) => s.cn === initial.species)?.hpPerLevel ?? 0` 反查
- [ ] 3.3 新增回填函式 `backfillSpeciesHpPerLevel`：依中文種族名自 `SPECIES` 補齊，查無者為 0
- [ ] 3.4 將 3.3 接入 `lib/characters/fetch.ts` 的讀取路徑，**並同步接入分享檢視的 `get_shared_character` 取讀路徑**——兩處回填必須一致，否則分享檢視端的升級資訊與主人端不同
- [ ] 3.5 建角送出時寫入 `speciesHpPerLevel`（內建與自訂種族皆走 `SpeciesOption.hpPerLevel`）；**有限次數能力於送出時展開為角色卡 `resources` 項目**（次數為「熟練加值」時快照該意圖而非當下數字，見 D9）

## 4. 編輯頁（依賴 2）

- [ ] 4.1 新增 `next/components/species/species-manager.tsx`：排列與元件沿用 `components/backgrounds/background-manager.tsx`，含 `embedded` 模式（規則說明以 `<details>` 摺疊）
- [ ] 4.2 名稱／英文名欄位；速度、黑暗視覺距離（無／60/120）、每級額外 HP、技能可選數皆以選單呈現
- [ ] 4.3 體型三選一（固定中型／固定小型／可選中型或小型）
- [ ] 4.4 可選技能來源：自 `SKILLS` 18 項勾選，並即時顯示「至少需勾選 N＋1 項」的驗證狀態
- [ ] 4.4b 有限次數能力編輯（D9）：每則含名稱（必填）、次數（1/2/3/熟練加值）、回復時機（短休／長休）、說明（選填）；條目數上限
- [ ] 4.5 特性條目編輯：每則含**名稱（必填）與說明（選填）兩欄**，可新增／刪除／排序，套用條目數與各欄長度上限
- [ ] 4.6 明示「修改與刪除不影響已建立的角色」
- [ ] 4.6b 頁面頂部加規則依據說明區塊（比照自訂背景編輯頁的 `_RulesNotice`）：2024 版種族不給能力值加值（在背景）、各欄位可選範圍、特性為純文字無機制效果、**種族無官方建構框架屬社群 homebrew 需與 DM 確認**、App 只驗結構不驗平衡；措辭需能分辨哪些是規則、哪些是本 App 的取捨
- [ ] 4.7 新建時以 `generateShareToken()` 產生 id（`next/lib/share/token.ts`）
- [ ] 4.8 `next/app/library/page.tsx` 新增種族區塊（比照既有的背景與子職區塊）——不新增路由，收藏紀錄頁就是管理入口
- [ ] 4.9 觸控目標 ≥ 44px（見根目錄 CLAUDE.md），色彩一律取 `globals.css` 的 token

## 5. 建角流程整合（依賴 2、4）

- [ ] 5.1 `next/components/creation/create-wizard.tsx` 種族步驟：選項改為 `[...SPECIES, ...customSpecies]`（比照 `allBackgrounds`），自訂項沿用 `isCustom` 旗標顯示「名稱（自訂）」
- [ ] 5.2 選取後一律轉為 `SpeciesOption` 驅動既有邏輯（敘述卡、體型選擇列、種族技能勾選），**不新增第二條分支**
- [ ] 5.3 自訂項的敘述卡帶「編輯／刪除」動作（刪除需二次確認），並提供「+ 自訂種族」入口
- [ ] 5.4 未登入／離線降級：顯示內建 9 個種族與「自訂種族離線不可用」提示，不阻擋建角
- [ ] 5.5 **無自訂種族時的指路**（design Open Q4 的配套）：種族步驟顯示一行「想用自創種族？先到收藏紀錄建立，再回來這裡選用」並連往 `/library`；離開再回來由既有草稿保全接住，不另做保存

## 6. 測試

- [ ] 6.1 `CustomSpecies` 驗證測試：名稱空白、速度非級距值、數值越界、可選技能含非法名稱、可選技能數不足 → 皆判定不合法；強度誇張但結構合法 → 判定合法
- [ ] 6.2 `toSpeciesOption()` 轉接測試：三種體型模式各自產生正確的 `size` 與 `effectiveSizeChoices`；`en` 留空時的行為；`SpeciesTrait` 正確映射至角色卡特性欄位
- [ ] 6.3 server actions 測試（比照 `lib/backgrounds` 既有測試）：未登入的行為；查詢過濾 tombstone 且依 `created_at` 升冪；upsert 送出提升欄位；softDelete 為 update `deleted_at`
- [ ] 6.4 `speciesHpPerLevel` 回填測試：無此欄位的舊矮人角色讀入後補為 1；未知種族補為 0
- [ ] 6.4b 有限次數能力測試（D9）：建角送出後於角色卡 `resources` 產生對應項目；次數為「熟練加值」者隨等級變動而非快照當下數字；短休／長休回復行為正確
- [ ] 6.5 升級測試：以自訂種族（每級額外 HP 1）建立的角色升級，HP 成長含該加值
- [ ] 6.6 建角測試：自訂種族與內建並列、標示「（自訂）」、選取後帶入體型與種族技能、快照的種族名正確
- [ ] 6.6b 規則說明測試：管理介面載明各欄位界限、能力值加值來自背景、需與 DM 確認
- [ ] 6.7 離線降級測試：自訂種族取用失敗時顯示提示且流程可續行

## 7. 收尾

- [ ] 7.1 `npx tsc --noEmit` 與 `npx eslint .` 全數通過
- [ ] 7.2 `npx vitest run` 全綠
- [ ] 7.3 線上（或 dev server）走完整流程：建立自訂種族（含帶說明的特性）→ 以其建角 → 升級確認 HP 加值 → 修改該自訂種族 → 確認既有角色不受影響 → 刪除 → 確認既有角色仍正常
