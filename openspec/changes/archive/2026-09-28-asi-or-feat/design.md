## Context

- 升級流程（`next/components/level-up/level-up-view.tsx`）是一頁到底的 client 元件，由 Server Component 頁面取內容庫資料後傳入。`plan.hasAsi` 為真時顯示「屬性值提升」區段（+2 或 +1/+1）。
- `applyLevelUp`（`next/lib/rules/level-up.ts`）以 `choices.asi: Record<code, number>` 加能力值，並一律夾至 20。驗收依據 `golden/apply_level_up.json`。
- 升級規格在未歸檔的 `level-up-flow` change 內（`character-level-up`），其「ASI」requirement 描述的是只有 ASI 的行為。本 change 以新 capability `level-up-feat` 描述擴充後的行為；日後兩者歸檔時，`character-level-up` 的 ASI requirement 應改指向 `level-up-feat`。
- 內容庫 `feats` 表已存在（SRD 17 筆），RLS 開 `feats_public_read`（anon、authenticated），anon 有 SELECT。相關欄位：`name`、`eng_name`、`data.category`（G 通用／EB 史詩恩賜／FS 戰鬥風格／O 起源）、`data.prerequisite`、`data.ability`、`data.entries`。
  - G：屬性值提升、擒抱大師（ability: choose str|dex；prereq: level 4 且 str 13 **或** dex 13）
  - EB：7 個恩賜（ability: choose 各自範圍，`max: 30`；prereq: level 19，法術回想另要求施法能力）
- 角色卡沒有手動新增特性的入口，所以專長若不在升級當下記下，之後就記不進去。
- 背景的自訂起源專長已有「名稱＋說明＋`isCustom`」模式（`originFeatCustom`，名稱上限 20、說明上限 200）。

## Goals / Non-Goals

**Goals:**
- ASI 等級可改選 SRD 通用專長（Lv19 含史詩恩賜）或自訂專長
- 專長的 +1 能力值與 ASI 走同一條加值路徑，CON 回溯 HP 等既有連動自動成立
- 專長以一筆 `CharacterFeature` 記入角色卡
- ASI 模式的輸出與現行**逐位元相同**（golden 不變）

**Non-Goals:**
- 自訂專長庫（跨角色重用／分享）
- 戰鬥風格專長（職業特性選擇，屬 `class-choice-features`）
- 事後把已完成的 ASI 改成專長；角色卡手動新增特性
- 專長效果的機制連動（除 +1 能力值外不改衍生數值）

## Decisions

### D1. 同一區段內三選一，不拆步驟

區段標題改為「屬性值提升或專長」（英文 `ABILITY SCORE / FEAT`），頂端一列三顆模式鈕：**屬性值提升｜內容庫專長｜自訂專長**，預設「屬性值提升」。下方依模式切換內容。

*理由*：升級頁刻意一頁到底（檔頭註解），三種模式互斥且都是同一個「本級的通用專長」決定。拆成子步驟只增加點擊。
*替代*：先選「ASI／專長」二選一，再在專長裡分內容庫／自訂——多一層，而內容庫實際上只有 1 個（Lv19 為 7 個）選項，兩層不值得。

模式鈕為 `<button aria-pressed>`，高度 ≥ 44px，沿用現有 ASI 模式鈕的樣式（`border-gold bg-gold/10 text-gold`／`border-border-2`）。**不新增色彩 token。**

### D2. 規則層：專長與能力值上限成為 `LevelUpChoices` 的欄位

```ts
type LevelUpChoices = {
  ...
  asi?: Record<string, number>;   // 不變：ASI 與專長的能力加值都走這裡
  /** 能力值夾值上限。預設 20；史詩恩賜為 30。 */
  abilityCap?: number;
  /** 本級取得的專長（ASI 模式為 undefined）。 */
  feat?: CharacterFeature;
};
```

`applyLevelUp` 的夾值上限改為 `choices.abilityCap ?? 20`，且**只夾有加值的能力、上限不低於現有分數**——原本對全部能力夾 20，19 級以恩賜到 21 後升 20 會被靜默夾回（實作時發現）。`feat` 附加到 `features` 尾端（在職業特性之後）。

*理由*：專長的 +1 在規則上就是能力值提升，走 `asi` 讓 CON 修正回溯、技能／被動察覺／法術 DC 重算全部自動成立——另開一條路就是「同一個東西兩份實作」。上限由呼叫端決定，規則函式不需要知道「這是史詩恩賜」。
*替代*：`applyLevelUp` 收 feat 的完整資料自行解析——把內容庫格式帶進純規則函式，測試要造 5etools 資料，不划算。

### D3. 內容庫專長的候選與先決條件：固定清單解析

新增 `next/lib/rules/feats.ts`（純函式，有測試）：

- `featCandidates(feats, targetLevel)`：取 `category === 'G'`，排除 `Ability Score Improvement`（它就是 ASI 模式）；`targetLevel === 19` 時加入 `EB`。
- `featAbilityOptions(feat)`：讀 `data.ability[0].choose.from` 轉為能力代碼；`max` 有值者為上限，否則 20。沒有 `ability` 的專長不加能力值。
- `featPrereqUnmet(feat, character, targetLevel): string | null`：`prerequisite` 是**任一滿足即可**的陣列；每個元素內各鍵**全部**要滿足。只認 `level`、`ability`（`{str: 13}` 等，以升級**前**的分數判斷——先決條件在取得當下檢查）、`spellcasting2020`（`character.spellcastingAbility !== ''`）。**不認得的鍵視為滿足**。回傳人讀的原因（如「需要力量或敏捷 13」），供 UI 顯示。

*理由*：SRD 範圍內就這三種鍵，比照 `ac.ts` 的固定清單原則，不寫條件引擎。不認得的鍵放行而非封鎖：內容庫重匯多出一種鍵時，最壞情況是玩家可以選一個不合格的專長（玩家自己知道），而不是整個專長消失。

先決條件未滿足的專長**仍列出、停用、下方顯示原因文字**——只變灰不說明，新手不知道為什麼。

選定內容庫專長後，若該專長有能力選項則顯示一個 `AbilityPicker`（既有元件，候選限於 `from`），標籤「+1 給誰」，必選。

### D4. 自訂專長：名稱＋說明＋可選 +1

- 名稱（必填，≤ 20 字）、說明（選填，≤ 200 字）——與自訂起源專長同一組上限。把 `ORIGIN_FEAT_NAME_MAX`／`ORIGIN_FEAT_DESC_MAX` 移到共用位置並改名為 `FEAT_NAME_MAX`／`FEAT_DESC_MAX`，背景端改引用，不再各自定義。
- 「附帶 +1 能力值」切換（預設**開**——2024 的通用專長幾乎都是半專長），開啟時顯示六項皆可選的 `AbilityPicker`。
- **史詩恩賜勾選**：僅在目標等級為 19 時顯示「這是史詩恩賜」勾選，**預設不勾**。勾選時 +1 的上限為 30、條目來源改為「史詩恩賜：Lv19」；不勾或非 19 級時上限 20。

*理由*：自由填空違反「軌道選單」原則，但這裡填空的是**內容**（不在 SRD 的專長），不是規則選項；規則面（能不能加值、加多少、上限）仍是軌道。與 homebrew 路線一致——自訂內容由使用者提供，App 管機制。
*只在 19 級出現的理由*：史詩恩賜的先決條件就是 19 級，19 級之後也不再有 ASI 等級；其他等級出現這個勾選只會讓玩家在 4 級就能把能力值推過 20，違反「規則面走軌道」。
*預設不勾的理由*：勾選是**放寬**上限的動作，由玩家明確表態才放寬；預設不勾時最壞情況是恩賜少加 1 點（玩家看得到、會自己勾），預設勾則可能讓一般專長悄悄超過 20。

輸入框以 `<label>` 綁定，字數顯示 `n／20`。

### D5. 寫入角色卡的專長條目

| 欄位 | 內容庫專長 | 自訂專長 |
|---|---|---|
| name | `name`（中文） | 使用者輸入（trim） |
| nameEn | `eng_name` | `''` |
| source | `專長：Lv{target}`；EB 為 `史詩恩賜：Lv{target}` | `專長：Lv{target}`；勾選史詩恩賜時為 `史詩恩賜：Lv{target}` |
| description | `ftFlattenEntries(data.entries)` | 使用者輸入 |
| isCustom | `false` | `true` |

ASI 模式**不寫**條目——維持現行輸出與 golden，且「屬性值提升」這筆條目沒有閱讀價值（效果已在能力值上）。

**專長格職業特性的去重**（實作時補）：內容庫的職業特性本來就含「屬性值提升」（Lv4 等）與「史詩恩賜」（Lv19），升級時會照常寫入。選了專長時，這兩筆**不再寫入**——專長條目已代表這一格，並列看起來像重複取得。選屬性值提升時照舊保留，那是這一格唯一的紀錄。判斷以 `eng_name` 固定清單（`isFeatSlotFeature`）。

分享檢視沿用特性清單，自創標示由 `isCustom` 驅動，不需改動。

### D6. 取資料：Server Component 並行讀 `feats`

`next/lib/catalog/fetch.ts` 新增 `fetchFeats()`：`createAnonClient`，`.from('feats').select('id,name,eng_name,data')`，以 `data->>category in (G, EB)` 在伺服器端過濾；zod 驗證失敗或錯誤時回 `{ feats: [], error }`。不包 `cache()`：每次請求只呼叫一次，與其他內容庫查詢一致（實作時修正）。

升級頁的 Server Component 與既有的子職／特性查詢 `Promise.all` 並行；**只有 `plan.hasAsi` 的等級才查**（其他等級不需要）。結果以 `feats` 與 `featsOffline` 兩個 prop 傳入 `LevelUpView`。

*理由*：內容庫是公開資料，走 anon client；放在 Server Component 與既有模式一致，client 不直接碰 Supabase。

### D7. 離線降級

`featsOffline` 為真時，「內容庫專長」模式鈕仍可按，內容為一段說明：「專長清單目前無法取得（內容庫離線）。可改用自訂專長記下專長名稱與效果。」——不隱藏模式鈕，避免版面在離線時跳動、也讓玩家知道有這條路。ASI 與自訂專長不受影響。

### D8. 狀態與草稿

新增 client state：`featMode: 'asi' | 'catalog' | 'custom'`、`catalogFeatId`、`catalogAbility`、`customName`、`customDesc`、`customBoost`、`customAbility`、`customEpic`。+1 的選擇依模式分開存，切模式才不會互相覆蓋（實作時由單一 `featAbility` 拆開）。全部併入既有的 `useFormDraft` 值（重新整理不遺失）。**不反映在 URL**——這是表單暫態，草稿已涵蓋重新整理，URL 帶了反而會在分享或返回時重現半填的表單。

就緒條件 `asiReady` 擴充為 `featReady`：
- asi：現行條件
- catalog：已選專長、先決條件滿足、若有能力選項則已選
- custom：名稱非空白、若開 +1 則已選能力

切換模式時**保留**各模式已填內容（只以 `featMode` 決定送出哪一份），切回來不必重填。

### D9. backlog 更新

`class-choice-features/proposal.md` 刪除「專長（Feats）」一項及「建議與專長同批」字樣，改為一行指向本 change。

## Risks / Trade-offs

- [史詩恩賜勾選是玩家自述，App 無法驗證自訂專長真的是恩賜] → 只在 19 級出現、預設不勾，影響範圍限於 19 級那一次的 +1；自訂內容本來就由玩家負責。
- [先決條件不認得的鍵一律放行] → 刻意取捨（D3）；`feats.test.ts` 對 SRD 17 筆實際資料做快照測試，重匯後資料形狀變了會在測試中看到。
- [已用 ASI 升過級、其實想選專長的角色無法補救] → 非目標；角色卡手動增刪特性另立需求。
- [`feats` 表不在 `supabase/migrations/`（由匯入管線建立）] → 本 change 只讀不改表；task 中實測 anon 讀取（已於規劃時確認 RLS 與 GRANT）。

## Migration Plan

無資料庫 migration、無角色資料 schema 變更（`CharacterFeature` 不動）。依一般流程 `opennextjs-cloudflare build` → `wrangler deploy`，驗證線上 chunk 已換版。回退即重新部署前一版；新增的專長條目在舊版中就是普通特性，不會壞。

## Open Questions

（無。）
