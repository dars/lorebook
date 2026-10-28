## Why

施法職業每升一級都可能學到新的戲法或法術（法師每級抄 2 道進法書；其餘職業依可備法術數的差額），但 Next.js 版的升級頁**沒有選法術的步驟**。Flutter 版原本有（`level-up-flow` 任務 3.6），移植時漏掉，`docs/flutter-parity.md` 記為「法術補選 UI」缺口。

規則層其實早就算好了：`planFor` 會算出 `cantripPicks`／`spellPicks`，`applyLevelUp` 也接受 `cantrips`／`spells` 參數——只是介面從來沒有把選擇傳進去。實測把法師賽德里克從 4 級升到 20 級，法術清單一道都沒有增加。角色卡的法術頁也沒有從內容庫新增法術的入口，所以玩家目前完全沒有辦法把升級學到的法術記進角色卡。

## What Changes

- 升級頁新增「新戲法」「新法術」兩個區段，只在本級有可選數量時出現
  - 候選限於該職業的法術清單；戲法為 0 環，法術為 1 環至本級可施放的最高環
  - 角色已經會的法術不重複列出
  - 選滿後其餘選項停用；可展開查看法術說明
  - 未選滿不可完成升級——例外：內容庫離線時可跳過；候選不足時選完所有候選即可
- 選擇納入升級頁的表單草稿
- 建角流程的法術選擇器抽出為共用元件，建角與升級共用同一份（不做第二份實作）
- 選法術的候選與就緒條件抽成 `lib/rules/` 的純函式並附測試

**非目標**：
- 升級時**替換**既有法術（2024 規則允許每級換一道；本次只做新增，與 Flutter 版相同）
- 邪術師的秘法奧義（Mystic Arcanum，11／13／15／17 級各一道 6–9 環法術）——它是職業特性而非可備法術數，另立
- 子職或職業特性給的額外法術（如生命領域的領域法術）——那是自動給予、無需選擇的，另立
- 已經升過級、漏掉法術的角色補選。這需要角色卡法術頁能從內容庫新增法術，是另一個入口，另立
- 自創法術出現在升級候選中（自創法術已有角色法術頁的選用入口）

## Capabilities

### New Capabilities
- `level-up-spells`: 升級時選擇新戲法與新法術——可選數量、候選範圍、已會法術排除、就緒條件、離線降級、寫入角色卡

### Modified Capabilities
（無。建角的選法術行為不變，只是元件改為共用；`level-up-feat` 不受影響。）

## Impact

- **資料層**
  - 靜態內容庫：升級頁**新讀取** `v_spells`（既有 view，`fetchSpells()` 已存在），僅在本級有可選數量時查詢，並在伺服器端依職業與環數過濾後才傳給 client。不新增表或 view，無 migration、無 RLS 異動
  - 角色卡：`user_characters.data` 的 `cantrips`／`spells` 陣列新增條目，沿用既有 `Spell` schema 與 `spellFromCatalog` 轉換，**不改 schema**
  - 自創內容、分享：無影響。分享檢視沿用既有法術頁呈現
- **程式**
  - `next/lib/rules/`：新增選法術候選與就緒條件的純函式
  - `next/components/spells/`：新增共用的內容庫法術選擇器（由 `create-wizard.tsx` 內部的 `SpellPicker` 抽出）
  - `next/components/creation/create-wizard.tsx`：改用共用選擇器，行為不變
  - `next/components/level-up/level-up-view.tsx`：新增兩個區段、草稿欄位、就緒條件
  - `next/app/character-level-up/page.tsx`：有可選數量時讀取並過濾法術
- **版型**：升級頁在三種版型皆為單欄；選擇器沿用建角的格線（compact 1 欄、medium 2 欄、expanded 3 欄），觸控目標 ≥ 44px
- **相依**：無新 npm 相依
