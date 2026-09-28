> 無 migration、無 RLS 異動：`feats` 表既有，`feats_public_read`（anon、authenticated）與 anon SELECT 已於規劃時確認。

## 1. 規則層（可獨立驗證：只跑 vitest）

- [x] 1.1 `next/lib/rules/level-up.ts`：`LevelUpChoices` 加 `abilityCap?: number`、`feat?: CharacterFeature`；夾值改為 `Math.min(Math.max(score + asi[code], 1), choices.abilityCap ?? 20)`；`feat` 附加於 `features` 尾端（D2）。測試：`golden/apply_level_up.json` 全數仍通過（ASI 行為不變）；新增 cap 30 時 20→21、cap 預設時 20→20；專長 +1 CON 使修正提升時回溯 `Δmod × 舊等級` HP；`feat` 出現在特性清單最後
- [x] 1.2 新增 `next/lib/rules/feats.ts`（D3）：`featCandidates(feats, targetLevel)`（category G 排除 `Ability Score Improvement`；Lv19 加 EB）、`featAbilityOptions(feat)`（`data.ability[0].choose.from` → 能力代碼，`max` 缺省 20）、`featPrereqUnmet(feat, character, targetLevel)`（prerequisite 陣列任一組滿足；組內 `level`／`ability`（升級前分數）／`spellcasting2020` 全滿足；未知鍵視為滿足；回傳中文原因或 null）。規則來源：SRD 5.2 Feats 章節。測試：以 SRD 17 筆實際資料（從 `feats` 表匯出成 fixture）驗證 Lv4 候選只有擒抱大師、Lv19 為擒抱大師＋7 恩賜；STR12/DEX12 停用且原因含「力量或敏捷 13」、STR10/DEX14 可選；無施法者的法術回想恩賜停用；擒抱大師能力選項為 STR/DEX、戰技恩賜上限 30
- [x] 1.3 專長條目建構函式（放 `feats.ts`）：`catalogFeatFeature(feat, targetLevel)` 與 `customFeatFeature(name, desc, targetLevel)`，欄位依 D5 表。自訂者多收 `epic: boolean`。測試：來源字串「專長：Lv4」、EB 與勾選史詩的自訂專長為「史詩恩賜：Lv19」、nameEn、isCustom、名稱 trim

## 2. 內容庫讀取（依賴：無；可與 1 並行）

- [x] 2.1 `next/lib/catalog/types.ts` 新增 `CatalogFeat` zod schema（id、name、eng_name、data：category／prerequisite／ability／entries，其餘 passthrough）
- [x] 2.2 `next/lib/catalog/fetch.ts` 新增 `fetchFeats()`：anon client、只取 `data->>category` 為 G／EB、失敗回 `{ feats: [], error }`（D6）。實測 anon 讀得到 9 筆（2 G ＋ 7 EB）
- [x] 2.3 `next/app/character-level-up/page.tsx`：僅在 `planFor(...).hasAsi` 時與既有查詢並行呼叫 `fetchFeats()`，傳 `feats`、`featsOffline` 給 `LevelUpView`

## 3. 共用常數（依賴：無）

- [x] 3.1 將 `ORIGIN_FEAT_NAME_MAX`／`ORIGIN_FEAT_DESC_MAX` 改為共用的 `FEAT_NAME_MAX`／`FEAT_DESC_MAX`（20／200），`lib/backgrounds/types.ts` 與 `components/backgrounds/background-manager.tsx` 改引用；不留舊名別名（D4）

## 4. 升級頁 UI（依賴：1、2、3）

- [x] 4.1 `AbilityPicker` 加 `allowed?: string[]`（限制候選能力），既有呼叫不受影響
- [x] 4.2 `level-up-view.tsx`：區段標題改「屬性值提升或專長」（`ABILITY SCORE / FEAT`）；三顆模式鈕（`aria-pressed`、≥ 44px、沿用既有模式鈕樣式，不新增色彩 token）；屬性值提升模式保留現有內容不動（D1）
- [x] 4.3 內容庫專長模式：列出 `featCandidates`，停用項顯示 `featPrereqUnmet` 原因文字；選定後若有能力選項顯示 `AbilityPicker`（`allowed`、標籤「+1 給誰」）；`featsOffline` 時顯示離線說明（D3、D7）
- [x] 4.4 自訂專長模式：名稱／說明輸入（`<label>` 綁定、`maxLength`、顯示 `n／20`、`n／200`）、「附帶 +1 能力值」切換（預設開）與六項 `AbilityPicker`；目標等級 19 時另顯示「這是史詩恩賜」勾選（預設不勾，勾選時 `abilityCap` 30）（D4）
- [x] 4.5 送出組裝：依 `featMode` 產生 `asi`、`abilityCap`、`feat` 傳入 `applyLevelUp`；預覽同步；`asiReady` 改為 `featReady`（D8 三種條件）
- [x] 4.6 `useFormDraft` 值納入 `featMode`、`catalogFeatId`、`catalogAbility`、`customName`、`customDesc`、`customBoost`、`customAbility`、`customEpic`，切模式不清空其他模式的輸入
- [x] 4.7 選了專長時，本級的「屬性值提升」／「史詩恩賜」職業特性不寫入（`isFeatSlotFeature`，D5 去重）

## 5. backlog 整理

- [x] 5.1 `openspec/changes/class-choice-features/proposal.md` 移除「專長（Feats）」一項與「建議與專長同批」字樣，改為指向 `asi-or-feat`（D9）

## 6. 驗證

- [x] 6.1 `npx tsc --noEmit`、`npx eslint .`、`npx vitest run`、`npm run build` 全數通過
- [x] 6.2 dev server 手動驗證（`set -a && . ./.dev.vars && set +a && npm run dev`，dev 帳號）：
  - 3 級戰士升 4：三種模式切換、ASI 結果與變更前一致且無專長條目
  - 選擒抱大師：能力選項只有力量／敏捷；力量敏捷皆 < 13 的角色看到停用原因
  - 自訂專長：8 級不見史詩恩賜勾選；18→19 時勾選預設未勾、勾選後 20 的能力可到 21；空白名稱不可完成；附帶 +1 體質後最大 HP 回溯正確；特性清單出現條目與自創標示
  - 重新整理後草稿恢復；分享連結檢視可見自訂專長
  - 模擬內容庫離線（暫時讓 `fetchFeats` 回錯）：內容庫模式顯示說明，其餘兩模式可完成
  - compact 與 expanded 寬度各看一次，觸控目標 ≥ 44px、淺色主題可讀

  **實測紀錄（2026-09-28，dev 帳號「賽德里克」法師 3→4）**：
  - ✅ 三模式切換、`aria-pressed`、模式鈕 44px；擒抱大師停用並顯示「需要力量 13 或 敏捷 13」
  - ✅ 自訂專長：空白名稱時確定鈕停用；4 級無史詩恩賜勾選；+1 感知後預覽被動察覺 13→14
  - ✅ 草稿寫入 sessionStorage 且含全部新欄位
  - ✅ 實際完成升級：感知 14、被動察覺 14；DB 的 Lv4 條目只有「鐵壁（專長：Lv4，isCustom）」，無「屬性值提升」職業特性；傳記分頁顯示自訂標示
  - ⏳ 未實測：重新整理後按「繼續」恢復草稿（被 beforeunload 攔下）、內容庫離線畫面、分享連結檢視（未建立分享；與角色頁共用 `character-sheet`）、compact 寬度截圖
  - ✅ **4→20 全程實測（2026-09-28）**：每級於升級頁操作並送出，DB 快照以獨立撰寫的 SRD 期望值逐級比對（能力值、HP 含 CON 回溯、熟練、法術 DC／攻擊、被動察覺、先攻、全部技能、法術位與已用保留、新增特性、專長條目），16 級全數通過。涵蓋：擲骰 HP（6）、ASI +2（8）、ASI +1/+1 至上限 20（12）、自訂專長 +1 CON 回溯 15 級 HP（16）、19 級自訂模式出現史詩恩賜勾選、擒抱大師停用與 7 恩賜可選、法術回想恩賜 INT 20→21（19）、20 級 INT 21 不被夾回

