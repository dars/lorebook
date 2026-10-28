## Context

- 升級頁（`next/components/level-up/level-up-view.tsx`）是一頁到底的 **client 元件**，由 Server Component（`next/app/character-level-up/page.tsx`）取內容庫資料後以 props 傳入。本 change 沿用這個分工：client 不直接碰 Supabase。
- `planFor()` 已算出 `cantripPicks`（戲法已知數差額）、`spellPicks`（法師固定 2；其他職業為可備法術數差額）與 `maxRing`（本級可施放的最高環）。`applyLevelUp()` 已接受 `cantrips`／`spells` 並附加到角色卡。**規則資料與寫入路徑都已存在，缺的是選擇介面與候選清單。**
- 建角流程（`create-wizard.tsx`）已有選法術的元件 `SpellPicker`（第 857 行起，檔內私有）：格線排列、選滿停用、ⓘ 開啟說明的 `EditorSheet`。轉換用 `lib/creation/spell-from-catalog.ts` 的 `spellFromCatalog()`。
- `fetchSpells()` 回傳全部 339 道 SRD 法術（含 `entries` 全文）。建角頁只傳 0–1 環給 client，理由是「全傳會讓 HTML 多出數百 KB」。
- Flutter 版的法術步驟（`level-up-flow` 任務 3.6）：依差額顯示戲法／法術區、已學不重列、選滿鎖定、可展開描述、未選滿不可續行。本 change 以它為行為對照，但以 Next 端現況為準。

## Goals / Non-Goals

**Goals:**
- 升級時可依本級差額選新戲法與新法術，寫入角色卡
- 建角與升級共用同一個選擇器元件
- 候選範圍與就緒條件是 `lib/rules/` 的純函式，有測試
- 內容庫離線時升級不被阻擋

**Non-Goals:**
- 替換既有法術、秘法奧義、子職或職業特性給的額外法術
- 已升級角色的法術補選（需要角色卡法術頁從內容庫新增法術的入口，另立）
- 自創法術進入升級候選

## Decisions

### D1. 共用選擇器：由建角抽出，不另寫

把 `create-wizard.tsx` 的 `SpellPicker`（含說明用的 `EditorSheet` 與 `StatChip` 呈現）原樣移到 `next/components/spells/catalog-spell-picker.tsx`，匯出為 `CatalogSpellPicker`；建角改為 import 它，**行為與樣式不變**。升級頁使用同一個元件。

*理由*：CLAUDE.md 明確要求「同一個東西不要有兩份實作」，而這個 codebase 已因兩份 `Pips` 與兩版法術卡出過事。
*命名*：`components/spells/spell-picker.tsx` 已被「自創法術選用對話框」佔用，兩者用途不同（一個選內容庫、一個選收藏紀錄），以 `catalog-` 前綴區分。

選擇器維持以法術 **名稱** 追蹤選取，與建角現況相同。考慮過改用 id（唯一鍵較嚴謹），但 SRD 內法術名稱不重複，而改 id 會讓建角草稿格式變更、需要相容層——為一個不存在的碰撞付出回歸風險，不划算。

### D2. 候選與就緒條件：`lib/rules/spell-picks.ts`

```ts
spellPickCandidates(spells, { classEn, ring: 'cantrip' | 'spell', maxRing, known })
  // classes 含 classEn；戲法取 level 0，法術取 1..maxRing；排除 known；依環數、名稱排序
spellPicksReady({ need, candidates, selected, offline })
  // offline → true；否則 selected.length === min(need, candidates.length)
```

- **已會的判斷**：角色卡的 `Spell` 沒有存內容庫 id。以 `nameEn` 比對（非空時），否則退回中文 `name`。自創法術（有 `homebrewId`）不參與比對——同名自創法術不代表會這道 SRD 法術（與 `ac.ts` 的 `knowsMageArmor` 同一原則）。
- **候選不足**：`min(need, candidates.length)`。SRD 範圍內實際不會發生，但若發生，擋著不能升級比少選一道更糟。

*理由*：就緒條件與「已會」的比對規則，錯了都是靜默的（多選一道、少選一道、重複學同一道），放在純函式裡才測得到。

### D3. 伺服器端過濾後才傳給 client

`page.tsx` 僅在 `plan.cantripPicks + plan.spellPicks > 0` 時呼叫 `fetchSpells()`，並先過濾為「`classes` 含該職業、`level <= maxRing`」再傳給 `LevelUpView`。

*理由*：沿用建角頁的做法。全傳 339 道含全文的法術會讓 HTML 多出數百 KB，而一個職業在單一等級用得到的是其中一部分。
*不做*：另開 API 延遲載入說明文字。量測後若單頁仍過大再考慮（見 Risks）。

「已會」的排除在 client 端做（D2 的函式），因為角色資料本來就在 client；伺服器端只做與角色無關的過濾，查詢結果不因角色而異。

### D4. 介面：兩個區段，放在「屬性值提升或專長」之後、「本級獲得」之前

- 區段標題沿用 `SectionTitle`：`NEW CANTRIPS`「新戲法（已選 n/N）」、`NEW SPELLS`「新法術（已選 n/N）」
- 法師的法術區段副標：「抄進法書的 2 道法術，環數不超過 {maxRing} 環」；其他職業：「可備法術增加 N 道」——讓玩家知道這個數字從哪來
- 某區段可選數為 0 時不渲染（比照建角對聖騎士／遊俠「戲法 0/0」的處理）
- 選擇器的格線、選滿停用、ⓘ 說明全部由共用元件提供

選取結果經 `spellFromCatalog()` 轉為 `Spell`，傳入 `applyLevelUp` 的 `cantrips`／`spells`。預覽區不另外列出新法術——「確定升級」前，選擇器本身已經顯示所選。

**不反映在 URL**：與屬性值提升／專長相同，這是表單暫態，由草稿涵蓋重新整理。

### D5. 就緒條件併入「確定升級」

`featChoice.ready && hpReady && subclassReady && cantripsReady && spellsReady`。未選滿時按鈕停用；為了讓玩家知道為什麼按不下去，區段標題的「已選 n/N」在未滿時維持次要色，選滿變金色。

### D6. 離線降級

`fetchSpells()` 失敗或回空陣列時傳 `spellsOffline`。兩個區段改為一段說明：「法術清單目前無法取得（內容庫離線）。可先完成升級，數值不受影響——但這一級的新法術需要之後自行補記。」並且就緒條件視為滿足。

*取捨*：離線時跳過的法術目前**沒有**補選入口（Non-Goals）。文案誠實寫出「需要之後自行補記」，而不是暗示之後會提醒。

### D7. 草稿

升級頁草稿新增 `newCantrips`、`newSpells`（法術名稱 string[]）。恢復時濾掉已不在候選中的名稱（例如內容庫修正譯名），並沿用 `?? []` 容錯本變更之前的草稿。建角草稿不變。

## Risks / Trade-offs

- [高等級全施法者的候選可達上百道，含全文的 props 可能讓 HTML 明顯變大] → task 中量測 17 級法師升 18 級的頁面大小；超過 300 KB 再改為只傳摘要、說明延遲載入
- [以名稱比對「已會」：內容庫修正譯名後，舊角色卡上的中文名可能對不上] → 優先用 `nameEn` 比對（譯名修正不動英文名）；建角寫入的法術都有 `nameEn`
- [離線跳過的法術無補選入口] → 文案明說；補選入口列為後續 change
- [抽出共用元件可能讓建角回歸] → 建角端行為不變是 task 的明確驗收項；建角的實際選取以手動驗證走一次

## Migration Plan

無資料庫 migration、無角色資料 schema 變更。依一般流程 `opennextjs-cloudflare build` → `wrangler deploy`，驗證線上 chunk 已換版。回退即重新部署前一版；新增的法術條目在舊版中就是普通法術。

## Open Questions

（無。）
