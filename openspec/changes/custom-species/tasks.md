> **相依**：本 change 需在 `feature-descriptions` 落地之後實作（特性的 `SpeciesTrait` 型別由該 change 定義）。

## 1. 資料庫（需 migration ＋ 新 RLS 政策）

- [ ] 1.1 新增 migration `0006_user_species.sql`：建立 `public.user_species`（`id text primary key`、`user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`、`name text not null default ''`、`data jsonb not null`、`created_at`／`updated_at timestamptz not null default now()`、`deleted_at timestamptz`），欄位與註解比照 `0004_user_backgrounds.sql`
- [ ] 1.2 同 migration 建立索引 `(user_id)`，並複用既有 `public.set_updated_at()` 建 `before update` trigger
- [ ] 1.3 同 migration 設定 RLS：四條 own-row policy（select／insert／update／delete 皆 `(select auth.uid()) = user_id`）、`grant ... to authenticated`、`revoke all ... from anon`
- [ ] 1.4 以 Supabase CLI 套用至 dev 專案，並以 anon key 驗證查不到任何列

## 2. Domain 與 Repository（依賴 1）

- [ ] 2.1 新增 `lib/features/character/domain/custom_species.dart`：freezed model `CustomSpecies`（id、name、nameEn、speed、sizeMode、darkvisionFt、hpPerLevel、skillPickCount、skillPickFrom、traits（`List<SpeciesTrait>`）、description）＋ `toSpeciesOption()` 轉接（`en` 留空時角色快照的 `speciesEn` 為空字串）
- [ ] 2.2 於同檔定義軌道常數：速度級距（20/25/30/35/40 ft）、體型模式列舉（固定中型／固定小型／可選）、每級額外 HP 與技能可選數的合法範圍、traits 條目數與長度上限
- [ ] 2.3 於同檔加入 `isValid` 驗證（結構合法性：名稱非空、速度屬級距、數值在範圍、可選技能皆為 `kSkills` 內的名稱、可選技能數 ≥ 可選數＋1）；**不驗證平衡**
- [ ] 2.4 新增 `lib/features/character/data/custom_species_repository.dart`：`fetchAll`（過濾 tombstone、依 `created_at` 升冪）、`upsert`（送出提升欄位 `name` 與完整 `data`）、`softDelete`；未登入時讀取擲 `DataException`、寫入靜默略過——行為比照 `CustomBackgroundRepository`
- [ ] 2.5 新增 `customSpeciesProvider`（`CustomSpeciesNotifier`，比照 `customBackgroundsProvider`）

## 3. 角色快照與升級修正（依賴 2.1；可與 4 並行）

- [ ] 3.1 `lib/features/character/domain/character.dart` 新增 `speciesHpPerLevel` 欄位（`@Default(0) int`）
- [ ] 3.2 `lib/features/character/domain/level_up.dart` 的 `LevelUpPlan.forCharacter` 改讀 `c.speciesHpPerLevel`，移除 `kSpecies.where((s) => s.cn == c.species)` 反查
- [ ] 3.3 新增回填函式 `backfillSpeciesHpPerLevel`（比照 `backfillClassResources`）：依中文種族名自 `kSpecies` 補齊，查無者為 0
- [ ] 3.4 將 3.3 接入 `CharacterSyncRepository.fetchAll` 的回填鏈，**並同步接入 `CharacterShareRepository.fetchSharedCharacter`**——兩處回填必須一致，否則分享檢視端的升級資訊與主人端不同
- [ ] 3.5 建角送出時寫入 `speciesHpPerLevel`（內建與自訂種族皆走 `SpeciesOption.hpPerLevel`）

## 4. 編輯頁（依賴 2）

- [ ] 4.1 新增 `lib/features/character/presentation/custom_species_edit_page.dart`：排列與元件沿用 `custom_background_edit_page.dart`
- [ ] 4.2 名稱／英文名欄位；速度、黑暗視覺距離（無／60/120）、每級額外 HP、技能可選數皆以選單呈現
- [ ] 4.3 體型三選一（固定中型／固定小型／可選中型或小型）
- [ ] 4.4 可選技能來源：自 `kSkills` 18 項勾選，並即時顯示「至少需勾選 N＋1 項」的驗證狀態
- [ ] 4.5 特性條目編輯：每則含**名稱（必填）與說明（選填）兩欄**，可新增／刪除／排序，套用條目數與各欄長度上限
- [ ] 4.6 明示「修改與刪除不影響已建立的角色」
- [ ] 4.7 新建時以 `generateShareToken()` 產生 id（`lib/shared/util/random_token.dart`）
- [ ] 4.8 `lib/app/router.dart` 新增 `/custom-species-edit` 路由（比照 `/custom-background-edit`，`state.extra` 帶入既有 `CustomSpecies` 表示編輯）
- [ ] 4.9 觸控目標 ≥ 48dp，樣式沿用金色／暗黑主題

## 5. 建角流程整合（依賴 2、4）

- [ ] 5.1 `character_create_page.dart` 種族步驟：選項改為「`kSpecies` ＋ 自訂種族」合併，自訂項顯示「名稱（自訂）」
- [ ] 5.2 選取後一律轉為 `SpeciesOption` 驅動既有邏輯（敘述卡、體型選擇列、種族技能勾選），**不新增第二條分支**
- [ ] 5.3 自訂項的敘述卡帶「編輯／刪除」動作（刪除需二次確認），並提供「+ 自訂種族」入口
- [ ] 5.4 未登入／離線降級：顯示內建 8 個種族與「自訂種族離線不可用」提示，不阻擋建角

## 6. 測試

- [ ] 6.1 `CustomSpecies` 驗證測試：名稱空白、速度非級距值、數值越界、可選技能含非法名稱、可選技能數不足 → 皆判定不合法；強度誇張但結構合法 → 判定合法
- [ ] 6.2 `toSpeciesOption()` 轉接測試：三種體型模式各自產生正確的 `size` 與 `effectiveSizeChoices`；`en` 留空時的行為；`SpeciesTrait` 正確映射為 `CharacterFeature` 的四個欄位
- [ ] 6.3 repository 測試（比照 `custom_background_repository_test.dart`）：未登入時 fetch 擲錯／寫入靜默略過；查詢過濾 tombstone 且依 `created_at` 升冪；upsert 送出提升欄位；softDelete 為 update `deleted_at`
- [ ] 6.4 `speciesHpPerLevel` 回填測試：無此欄位的舊矮人角色讀入後補為 1；未知種族補為 0
- [ ] 6.5 升級測試：以自訂種族（每級額外 HP 1）建立的角色升級，HP 成長含該加值
- [ ] 6.6 建角 widget 測試（比照 `create_with_custom_background_test.dart`）：自訂種族與內建並列、標示「（自訂）」、選取後帶入體型與種族技能、快照的種族名正確
- [ ] 6.7 離線降級 widget 測試：自訂種族取用失敗時顯示提示且流程可續行

## 7. 收尾

- [ ] 7.1 `flutter analyze` 與 `dart format .` 全數通過
- [ ] 7.2 `flutter test` 全綠
- [ ] 7.3 實機／模擬器走完整流程：建立自訂種族（含帶說明的特性）→ 以其建角 → 升級確認 HP 加值 → 修改該自訂種族 → 確認既有角色不受影響 → 刪除 → 確認既有角色仍正常
