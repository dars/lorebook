## Context

角色卡的雲端存放為 `public.user_characters`（`supabase/migrations/0001`、`0002`）：

- 複合主鍵 `(user_id, id)`，`id` 為客戶端產生的 text；`data jsonb` 存整份 `Character.toJson()`；`name` / `class_name` / `level` 為清單用提升欄位
- 刪除為軟刪除（`deleted_at` tombstone），`updated_at` 由 trigger 維護（LWW，不信客戶端時鐘）
- RLS 四條 own-row policy（`(select auth.uid()) = user_id`），僅 `grant ... to authenticated`，並 `revoke all ... from anon`

因此「把角色 id 給對方讓他查」在資料庫層就是空集合。要讓他人讀到，只能新增一條受控的讀取路徑。

三個對設計有利的既有條件：

1. **內容庫已 anon 公開唯讀**（`designs/SUPABASE.md`：內容表 `select` policy `using (true)`，前端用 anon key）。檢視者即使未登入，法術、職業特性、裝備等交叉引用內容仍可正常渲染——檢視頁不需要任何降級版型。
2. **`portraits` 為 public bucket**（`migrations/0003`），經 public URL 取圖不需登入。
3. **web 版與訪客試玩模式皆已存在**，未裝 App 的檢視者有落點。

一個必須處理的既有細節：`CharacterSyncRepository.fetchAll()` 在讀入時會跑 `migrateLegacyWeapons`（舊版靜態 weapons 清單轉 equipment）與 `backfillClassResources`（職業資源回填）。檢視端若直接反序列化 `data` 而不跑這兩道，舊角色會缺武器攻擊列與職業資源。

## Goals / Non-Goals

**Goals:**

- DM 與隊友能在跑團當下看到角色卡的**即時**數值，不需要主人重新發布
- 檢視者免註冊、免裝 App 即可看（web 版落點）
- 角色主人能明確知道自己分享了什麼給誰，並隨時撤銷
- 授權路徑不降低 `user_characters` 的既有隱私等級——原表的欄位、RLS、grant 一律不動
- 檢視為完整的角色卡體驗（行動與角色兩個情境都在），而非閹割的摘要

**Non-Goals:**

- **DM 寫入權限**（改 HP／狀態）：首版純唯讀，見 Open Questions 對後續路徑的預留
- **留言／註記**：不做檢視者對角色卡的回饋通道
- **欄位篩選**：整張卡全給，不做「隱藏背景故事」之類的分享設定
- **Campaign／團隊模型**：不引入團的概念，分享是點對點的
- **以帳號指名授權**：不做使用者搜尋與指名分享
- **Realtime 推播**：檢視頁於開啟／手動重新整理時抓取，不建立訂閱
- **公開索引**：見 D7
- **homebrew 分享**：獨立機制，見 D8

## Decisions

### D1：授權表 ＋ `SECURITY DEFINER` 函式，而非放寬原表權限

新增 `character_shares` 授權表（token → owner_id + character_id + 撤銷），**此表本身完全不對外可讀**（RLS 全限 `owner_id = auth.uid()`、`revoke all from anon`）。檢視者不查表，而是呼叫一支 `SECURITY DEFINER` 函式，傳入 token，由函式在 definer 權限下 join 兩張表並回傳角色文件。

函式的硬性約束：

- `set search_path = ''`，所有物件全名限定（與既有 `set_updated_at()` 同慣例）
- **唯一參數為 token**；不接受欄位選擇、篩選條件或任何可用來探測的參數
- 回傳前 SHALL 檢查全部失效條件：`revoked_at is null`、來源角色存在且 `deleted_at is null`
- 回傳內容僅角色文件本身；SHALL NOT 回傳 `owner_id`、`label`，或任何關於「這個 token 屬於誰」的資訊
- `grant execute` 給 `anon` 與 `authenticated`

**替代方案 A：在 `user_characters` 加一條 select policy，讓 anon 憑 token 查。** 否決。這需要 `grant select on public.user_characters to anon`——即使 policy 條件寫對，整張使用者私有資料表就多了一個 anon 的存取面，任何未來的 policy 疏漏都直接是全體使用者角色卡外洩。而且 token 得經由查詢條件傳入（例如 join 一張 anon 可讀的分享表），等於也要把分享表對 anon 開放，`label`（「DM」「小明」這種備註）與 `owner_id` 就變成可讀。用函式則把整條授權判斷收在一個可完整審視的物件裡，原表的 anon 存取面維持為零。

**替代方案 B：Edge Function 代查。** 否決。多一個部署單元、冷啟動延遲，還要另外保管 service_role key（一旦外洩即 bypass 全部 RLS）。換來的隔離性不比 `SECURITY DEFINER` 函式好——後者的權限邊界就是函式本身，且與資料同在一次 migration 內版本控管。

**替代方案 C：沿用 `homebrew-share` 的快照表。** 否決，見 D2。

### D2：活資料，不是快照——這是與 `homebrew-share` 的根本差異

檢視端每次開啟都讀 `user_characters` 的當下內容。

- 快照在這個使用情境下會**默默過期**：角色一扣血、一升級、一買裝備，DM 看到的就是錯的，而 DM 不會知道自己看的是舊資料。跑團中「錯的數字」比「沒有數字」更糟——會直接影響判定。
- 「快照＋手動更新」把正確性押在使用者記得按更新上，這個前提在戰鬥中不成立。
- 代價是持續授權的語意：分享一旦建立，角色卡的**任何**後續變動都對持有者可見（含傳記、背景故事——因為首版整張卡全給）。這在 Risks 中處理。

### D3：token 為 128-bit 隨機；每角色可多 token

`token` 為 128-bit 密碼學安全隨機值、base64url 編碼（22 字元），作為主鍵，**不由角色 id 或 user_id 推導**。

一個角色可同時存在多個未撤銷的 token：給 DM 一個、給每位隊友各一個。理由是撤銷的粒度——換 DM 或有人退團時，應該只讓那一條失效，而不是撤掉重發全部。`label` 欄位讓主人在管理清單裡認得出哪條是給誰的；此欄位**僅擁有者可讀**，函式不回傳。

安全模型為 capability URL：持有 token 即可讀，token 不可猜且無列舉路徑。適用於「分享給認識的同團成員」，不適用於需要指名授權的情境（本 change 不涉及）。

### D3a：首版無有效期限——分享與撤銷皆為手動

`character_shares` 首版**不含 `expires_at` 欄位**，函式也不做期限判斷。分享建立後持續有效，直到擁有者手動撤銷。

- 一檔戰役常跑數月，任何自動到期都會在中途讓 DM 突然看不到隊員的卡，而使用者不會預期到；「連結會自己失效」是要額外理解的概念，換來的收益在這個使用情境下接近零。
- 期限的實際價值在防範遺忘造成的孤兒分享，但同樣的問題已由「角色卡常駐顯示有效分享數」＋「一鍵撤銷」處理，且那條路徑是使用者看得見、控制得住的。
- **可逆性**：日後要加期限是純附加的 migration（新增 nullable `expires_at`，`null` 即為既有列的語意）＋ 函式多一條 `expires_at is null or expires_at > now()`，既有資料不需遷移，前端多一個選項。不做等於少維護一組狀態，不是把路堵死。

### D4：檢視者免登入；檢視頁不進入 auth guard

檢視路由 SHALL 豁免 router 的 auth redirect guard——未登入者停在檢視頁，不被導向 `/auth/login`。

- 掃碼的隊友可能沒裝 App、沒帳號。要求註冊才能看一眼角色卡，摩擦遠大於收益。
- 技術上可行且不需降級：內容庫已 anon 唯讀（Context 第 1 點），角色圖為 public bucket（第 2 點），函式對 anon 授權執行。
- 這也涵蓋「已登入使用者開別人的連結」——同一條路徑，不因登入狀態改變呈現。檢視頁 SHALL NOT 因為檢視者剛好是主人本人就切換成可編輯。

### D5：唯讀檢視涵蓋行動與角色兩頁，且必須套用相同的回填

檢視頁重用既有頁面，以「唯讀模式」呈現：所有編輯入口、擲骰、消耗（法術位、職業資源、HP 調整）一律不渲染，而非渲染後 disable——避免留下大量無作用的觸控目標。

**範圍是兩頁而非一頁。** 「角色卡」在 App 裡橫跨兩個情境：角色頁（總覽／屬性／法術／物品／傳記）是建卡結果，行動頁（狀態／資源／移動／動作／檢定／休息）才是跑團當下的即時數值。DM 要的被動察覺、AC、豁免在角色頁，但**當前 HP、臨時 HP、狀態異常、專注、剩餘法術位、攻擊列的命中與傷害全在行動頁**——只分享角色頁等於漏掉 DM 最需要的一半，而檢視者無從得知自己看的是不完整的卡。因此檢視頁以「行動／角色」兩個情境呈現，沿用 App 本身的分法，兩者各自保有原本的版型級距行為。

休息（短休／長休）不納入：那是角色主人自身的操作，不是可檢視的狀態。

**資料層無須改動**——RPC 回的是整份 `Character`，HP、conditions、slots、resources 本就都在 payload 裡，這純粹是前端渲染範圍的決定。

角色頁的五個 tab 已接受 `character` 參數（`CharacterPage` 於頁面層讀 `currentCharacterProvider` 後傳入），注入路徑本就成立。行動頁的六個 section 則直接讀 `currentCharacterProvider`，需比照加入可注入的 `character` 參數；唯讀時連 `currentCharacterProvider.notifier` 都不取，以滿足「檢視他人的卡不讀取也不改變自己的當前角色」。

憑 token 取回的 `data` SHALL 經過與 `CharacterSyncRepository.fetchAll()` 相同的回填鏈（`migrateLegacyWeapons` → `backfillClassResources`）。這不是最佳化，是正確性：漏掉就會讓舊角色在檢視端少掉武器攻擊列與職業資源，而主人自己看是正常的——這種不一致極難被回報。

### D5a：分享入口與管理放在總覽頁底部的區段

擁有者端的分享入口、有效分享清單與撤銷，SHALL 集中在角色頁「總覽」分頁底部的一個可收合區段（`CollapsibleSection`，與 `BASIC 基本資訊`、`STATS 戰鬥數值` 同一套視覺語言），預設收合，區段標頭顯示目前有效分享數。

- **就地管理**：分享是「這張角色卡的」屬性，放在角色卡上比放系統設定頁更貼近情境；區段一次容納建立、清單、撤銷三件事，不需另開頁面。
- **不放頁首 `CharacterHeader`**：該頁首橫跨決策／角色／日誌等角色情境頁，既有的 LEVEL 徽章已為此特別加了 `levelUpEnabled`，只在 `/main/character` 可點以避免他頁誤觸。再加一個 icon 等於把頁首變成 action bar，且該 Row 已被頭像、名稱與 LEVEL 徽章佔滿。
- **不放系統設定頁**：集中管理所有角色的分享要先選角色，多一層導覽換不到對應價值；跨角色的集中檢視可留待分享數成長後再評估。
- **代價**：總覽是跑團中最常翻的分頁，底部多一段會拉長捲動。緩解為預設收合——分享屬「設定一次、偶爾管理」的操作，不是每回合要用的。

### D6：連結與 QR 為同一個 URL 的兩種呈現；路徑與 homebrew 錯開

分享連結為 `https://<web-domain>/v/<token>`（`v` = view）。`homebrew-share` 佔用 `/s/<token>`，兩者 SHALL NOT 共用前綴——否則單看連結無法判斷會開出什麼，且 deep link 的路徑比對會互相干擾。

- 已裝 App：universal link（iOS）／app link（Android）直接開 App 內檢視頁
- 未裝 App：落到 web 版同一頁
- QR 產生為純本機繪製（無網路、無第三方服務）；22 字元 token ＋ 網域遠低於任何容量限制

### D7：無列舉介面——規格層的約束

App SHALL NOT 提供任何列舉、瀏覽或搜尋**他人**分享角色卡的介面；前端一律以 token 精確查單筆。資料庫層亦不存在支援此類查詢的路徑（函式唯一參數為 token，分享表對外完全不可讀）。

主人查看**自己**發出的分享清單不在此限——那是查自己的列，走既有 own-row RLS。

理由與 `homebrew-share` 的 D5 同源但更強：角色卡是使用者的個人資料，一旦存在可瀏覽的索引，App 就從「傳輸工具」變成「個人資料目錄」，隱私責任性質完全不同。寫成 `SHALL NOT` 而非「暫不實作」，讓未來要跨線時必須經過一次明確的規格變更。

### D8：與 `homebrew-share` 明確切開

兩套機制**不共用資料表、不互為前提、不共用 token 命名空間**：

| | `homebrew-share` | `character-share`（本 change） |
|---|---|---|
| 分享標的 | 內容定義 | 個人角色資料 |
| 語意 | 快照複製，匯入後各自獨立 | 活資料持續授權 |
| 儲存 | `shared_homebrew` 快照表（anon 可讀） | `character_shares` 授權表（anon **不可**讀）＋ 函式代查原表 |
| 撤銷效果 | 阻止新的匯入，已匯入的不受影響 | 立即斷開檢視 |
| 路徑 | `/s/<token>` | `/v/<token>` |

兩個 change 各自對 `data-layer` 新增**不同標題**的 requirement，delta 不重疊，可各自獨立 archive，無先後相依。

### D9：失效態可區分，且以主人為中心說明

token 無效時，函式回傳可區分的狀態，檢視頁分別呈現：

- 已撤銷 → 「角色主人已停止分享這張角色卡」
- 角色已刪除 → 「這張角色卡已被刪除」
- token 根本不存在 → 「找不到這個分享連結」

**取捨**：區分狀態等於承認「這個 token 曾經有效」。但 token 為 128-bit 隨機且無列舉路徑，能拿到一個曾有效 token 的人本來就是主人分享過的對象，這個資訊對他毫無新意。反過來，統一顯示「找不到」會讓 DM 誤以為自己貼錯連結而反覆嘗試。友善度的收益明顯大於這點資訊洩漏。

### D10：更新時機為開啟與手動重新整理，不做 Realtime

檢視頁在進入時抓一次，並提供下拉重新整理。不建立 Realtime 訂閱。

- 首版的使用節奏是「DM 要看的時候點開來看」，不是持續盯著；訂閱的成本（連線維護、電量、多人同時訂閱的扇出）換不到對應價值。
- 頁面 SHALL 顯示資料的抓取時間，讓檢視者知道自己看的是幾分鐘前的狀態——這是不做即時推播時的必要補償，否則「活資料」的承諾會反過來誤導。
- 撤銷的即時性同理：已開著頁面的人在下次抓取前仍看得到舊資料。Realtime 是後續可加的增量，不改變本 change 的資料模型。

## Risks / Trade-offs

- **capability URL 外流**：token 被轉貼到公開場合，任何人都能持續看到這張角色卡的即時狀態。→ 這是 capability 模型的本質。緩解：逐條撤銷（首版無期限，見 D3a）；分享 UI 明示「持有這個連結的人都能看到你的角色卡，包含之後的所有變動」；`label` 讓主人分辨該撤哪一條。

- **活資料的持續外洩面**：與快照不同，分享一旦建立就涵蓋**未來**的所有內容——包含事後寫進傳記頁的私人設定。使用者建立分享時看到的內容，不等於對方最終看到的內容。→ 緩解：分享 UI 的文案必須寫明「包含之後的所有變動」（而非只說「分享角色卡」）；主人可在角色卡上看到「目前有 N 條有效分享」的常駐提示，避免分享出去後遺忘。首版不做欄位篩選，是把選擇權留在「要不要分享」這個層級。

- **`SECURITY DEFINER` 寫錯即提權**：定義函式時漏掉 `search_path = ''`、或讓參數能影響查詢範圍，就可能被利用成讀取任意角色。→ 緩解：唯一參數為 token；函式內不使用動態 SQL；回傳固定形狀；migration 內註明其為 definer 函式與理由；驗證失效條件的測試須涵蓋撤銷、軟刪除、不存在三種路徑。

- **token 出現在 URL 中**：瀏覽器歷史、分享面板預覽、他人代開連結時的截圖都可能帶出 token。→ 這是 capability URL 的固有代價，homebrew 分享已接受同樣的風險等級。緩解：web 檢視頁不載入任何第三方資源（避免 referrer 帶出 token）；不把 token 寫進頁面標題。

- **`portraits` 的既有暴露面**：bucket 為 public，路徑慣例 `{user_id}/{character_id}.jpg` 可推導，任何知道這兩個 id 的人本來就能取圖。→ 本 change **不擴大也不修正**這個既有面（分享的 token 不洩漏 user_id）。若日後要收斂，屬獨立的 storage 權限調整。

- **離線／未登入的降級**：檢視頁完全依賴網路（活資料、內容庫查詢皆為雲端）。→ 無網路時明確顯示無法載入並提供重試，不做半殘的快取呈現。角色主人自己的離線行為不受本 change 影響。

- **孤兒分享累積**：首版無期限（D3a），使用者分享後遺忘則 token 永久有效。→ 緩解為角色卡常駐顯示有效分享數 ＋ 一鍵撤銷，讓遺忘的分享是「看得見的」而非靜默存在。若日後成本浮現，再評估加入期限。

- **與角色卡結構演進的耦合**：檢視端與編輯端共用 tab，未來新增 tab 或欄位時，唯讀模式若沒同步處理，可能漏渲染或誤露編輯入口。→ 緩解：唯讀性以「模式參數」統一控制而非各 tab 各自判斷；規格層寫明唯讀模式 SHALL NOT 呈現任何寫入操作，作為後續改動的檢查點。

## Migration Plan

**新增**：一支 migration 建立 `character_shares` 表、索引（`(owner_id)`、`(owner_id, character_id)` 供主人查自己的分享清單）、四條 own-row RLS 政策、`revoke all from anon`，以及 `SECURITY DEFINER` 讀取函式與其 `grant execute`。純新增，不動既有表。

**既有資料**：無需遷移。

**Rollback**：
- App 端：回退版本，分享入口消失；已發出的連結在 web 版仍可用（函式與表still在），若要一併停用則執行資料庫回退
- 資料庫：`drop function` ＋ `drop table public.character_shares`（僅使已發出的分享連結失效，使用者的角色卡完全不受影響）
- 單向門：無。本 change 的所有變更皆可逆。

**部署順序**：migration 先行（新增物件不影響既有版本的 App）；App 端可隨後發布。

## Open Questions

1. 分享連結路徑 `/v/<token>` 是否與未來的路由規劃衝突？需確認 `apple-app-site-association` / `assetlinks.json` 的路徑比對要同時涵蓋 `/s/` 與 `/v/`。
2. ~~建立分享時的期限選項預設為何？~~ 已決定，見 D3a：首版不做期限，分享與撤銷皆手動。
3. 是否在檢視頁顯示角色主人的顯示名稱？有助於辨識來源，但引入使用者資料的外洩面（函式目前刻意不回傳 `owner_id`）。傾向不顯示——角色名本身已足夠辨識。
4. ~~主人端的分享管理入口放哪裡？~~ 已決定，見 D5a：總覽頁底部的可收合區段。
5. 未來若要開放「DM 可改戰鬥狀態」，是在本表加 `can_edit` 旗標並擴充函式為可寫的 RPC，還是另立機制？本 change 不決定，但資料模型上不排除前者。
