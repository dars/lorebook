> 無 migration、無 RLS 異動：只讀既有的 `v_spells`（`fetchSpells()`），anon 讀取已於建角使用中。

## 1. 規則層（可獨立驗證：只跑 vitest）

- [ ] 1.1 新增 `next/lib/rules/spell-picks.ts`（design D2）：`spellPickCandidates(spells, { classEn, ring, maxRing, known })` 與 `spellPicksReady({ need, candidates, selected, offline })`。規則來源：SRD 5.2 各職業「已知戲法」「可備法術」表（`level-tables.ts` 的 `CANTRIPS_KNOWN`／`PREPARED_SPELLS`，golden 已驗證）；法師每級抄 2 道進法書
- [ ] 1.2 測試 `spell-picks.test.ts`：戲法只取 0 環；法術取 1..maxRing（法師 5 級不含 4 環）；只取該職業清單；以 `nameEn` 排除已會、`nameEn` 為空時退回中文名；有 `homebrewId` 的自創法術不參與排除；排序為環數→名稱；`ready` 在 offline 時為真、候選不足時以 `min(need, candidates)` 判定
- [ ] 1.3 以 `planFor` 補測可選數量：法師 3→4 為戲法 1＋法術 2、4→5 為法術 2；牧師 11→12 皆為 0；戰士皆為 0（驗證 spec 的四個情境）

## 2. 共用選擇器（依賴：無；可與 1 並行）

- [ ] 2.1 將 `create-wizard.tsx` 的 `SpellPicker`（含說明 `EditorSheet` 與 `StatChip`）移至 `next/components/spells/catalog-spell-picker.tsx`，匯出 `CatalogSpellPicker`；props 與樣式不變（design D1）
- [ ] 2.2 `create-wizard.tsx` 改 import 共用元件，刪除檔內版本；建角行為不變

## 3. 取資料（依賴：1）

- [ ] 3.1 `next/app/character-level-up/page.tsx`：僅在 `cantripPicks + spellPicks > 0` 且非補選子職模式時呼叫 `fetchSpells()`；以 `classes` 含 `classNameEn` 且 `level <= maxRing` 在伺服器端過濾；傳 `spells` 與 `spellsOffline` 給 `LevelUpView`（design D3、D6）

## 4. 升級頁 UI（依賴：1、2、3）

- [ ] 4.1 `level-up-view.tsx`：在「屬性值提升或專長」之後新增「新戲法」「新法術」兩個區段；可選數為 0 不渲染；標題含「已選 n/N」，未滿為次要色、滿為金色；法術區段副標依法師／其他職業顯示數量來源（design D4、D5）
- [ ] 4.2 候選以 `spellPickCandidates` 產生（`known` 為角色現有的 `cantrips`／`spells`），交給 `CatalogSpellPicker`
- [ ] 4.3 `spellsOffline` 時兩個區段改為離線說明（design D6 文案）
- [ ] 4.4 送出組裝：所選名稱經 `spellFromCatalog()` 轉為 `Spell`，傳入 `applyLevelUp` 的 `cantrips`／`spells`；「確定升級」的就緒條件加入 `spellPicksReady`
- [ ] 4.5 草稿納入 `newCantrips`、`newSpells`；恢復時濾掉不在候選中的名稱，舊草稿以 `?? []` 容錯；`started` 判斷包含已選法術（design D7）

## 5. 驗證

- [ ] 5.1 `npx tsc --noEmit`、`npx eslint .`、`npx vitest run`、`npm run build` 全數通過
- [ ] 5.2 量測頁面大小：17 級法師升 18 級時升級頁的 HTML 大小；超過 300 KB 時記錄並回到 design Risks 評估延遲載入說明
- [ ] 5.3 dev server 手動驗證（`set -a && . ./.dev.vars && set +a && npm run dev`，dev 帳號）：
  - 建 1 級法師：建角的戲法／一環法術選擇與上限不變（共用元件回歸）
  - 法師 3→4：出現新戲法 1、新法術 2；已會的不在候選；選滿後其他停用；未選滿不能升級；ⓘ 說明可開
  - 法師 4→5：候選含 3 環、不含 4 環；完成後 DB 的法術清單多 2 道且法術位使用狀況不變
  - 牧師或聖騎士升一級：戲法區段依職業正確出現／不出現
  - 戰士升級：兩個區段都不出現
  - 選 1 道後離開再回來：草稿恢復
  - 模擬內容庫離線（暫時讓 `fetchSpells` 回錯）：顯示離線說明且可完成升級
