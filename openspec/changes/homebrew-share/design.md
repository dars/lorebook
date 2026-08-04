## Context

現行 homebrew（自訂背景）為**純雲端、own-row、無本機持久化**：

- 存於 `user_backgrounds`（`data jsonb` + 提升欄位 `name`，LWW + `deleted_at` tombstone）
- RLS `auth.uid() = user_id`，並 `revoke all on public.user_backgrounds from anon`
- `CustomBackgroundRepository.fetchAll()` 未登入直接擲 `DataException`；App 內無 SharedPreferences／Hive 快取，僅 Riverpod session 內記憶體狀態

因此「把 id 給對方讓他查」在資料庫層就走不通——RLS 會過濾成空集合。要讓另一個使用者讀到內容，必須改變存取模型。

另一個現況問題：`CustomBackground` 的 id 由 `custom_background_edit_page.dart` 以 `DateTime.now().microsecondsSinceEpoch.toString()` 產生，表定義為 `id text primary key`。時間戳**可枚舉**，不能作為分享識別碼。

先前已就角色卡分享確認採 share-token 機制（token 對應角色 id、有效期限、可否撤銷），但那是「讓他人檢視我的活資料」，需要持續的權限模型。本 change 的性質不同：分享的是**內容定義的複製**，對方存成自己的一份後兩邊各自獨立，不需要持續授權關係。

## Goals / Non-Goals

**Goals:**

- 同團玩家能以 QR / 連結取得他人建立的 homebrew，免去重複建立
- 分享識別碼不可猜；原始資料列的隱私不因分享而降低
- 載體長度與內容大小脫鉤，未來的自訂職業等大型內容同樣適用
- 發布者可撤銷；撤銷後連結立即失效
- 未裝 App／未登入者可先預覽內容（降低分享的摩擦），存下來才要求登入

**Non-Goals:**

- **公開 homebrew 庫／瀏覽他人作品／搜尋**——見 D5，這是有意識不跨的線
- **持續同步**：匯入後不追蹤原作者的後續修改，兩份各自獨立
- **協作編輯**：不做多人共同編輯同一份 homebrew
- **角色卡分享**：仍為獨立的未來功能，其 share-token 機制不在本 change 範圍
- **離線匯入**：匯入需寫入自己的雲端，本就需要連線與登入

## Decisions

### D1：快照表，而非開放原始列

新增 `shared_homebrew` 表，發布時寫入內容的**當下快照**；`user_backgrounds` 的欄位、RLS、grant 完全不動。

- **理由**：
  - 原始列維持完全私有，「發布」是一個明確、可審視的動作，而非放寬既有表的權限
  - 作者之後修改自己的背景，不會偷偷改變別人已取得的連結內容（語意清楚：分享的是當時那一份）
  - 撤銷只寫 `revoked_at`，不影響原始列，也不會誤刪作者自己的資料
  - 單一張表以 `kind` 欄位吃下所有 homebrew 型別，未來新增種族／專長／法術／職業不需再 migration，也不必每種型別各開一套 RLS 政策
- **替代方案 A**：在 `user_backgrounds` 加 `shared boolean` 並放寬 select policy。**否決**——把「使用者私有資料表」變成部分公開，權限推理變複雜；且作者編輯會即時改變他人看到的內容。
- **替代方案 B**：Edge Function／`SECURITY DEFINER` 函式代查原始列。**否決**——多一個部署單元與冷啟動，換來的隔離性不如快照表，且仍有「作者編輯即時生效」的語意問題。

### D2：token 為 128-bit 隨機，與資料 id 完全分離

`token` 為 128-bit 密碼學安全隨機值，base64url 編碼（22 字元），作為表的 primary key。**不重用** `CustomBackground.id`。

同時將 `CustomBackground` 新建時的 id 產生方式由時間戳改為隨機值——即使 id 不用於分享，可枚舉的識別碼本身就不該存在。既有時間戳 id 的資料列原樣保留（id 僅為識別，不需遷移）。

- **安全模型**：capability URL——持有 token 即可讀取，token 不可猜且無列舉路徑。這對「分享給同團」的使用情境足夠；不適用於需要指名授權的情境（本 change 不涉及）。

### D3：anon 可讀，匯入需登入

`select` policy 開放 `anon` 與 `authenticated`，條件僅 `revoked_at is null`。

- **理由**：掃碼的人可能還沒裝 App、沒有帳號。讓他先在 web 版看到內容是什麼，再決定要不要註冊存下來，是比較順的漏斗；且快照內容本就是使用者主動發布的。
- **匯入**必須 `insert` 進 `user_backgrounds`，受既有 own-row RLS 約束，因此天然要求登入。未登入者按下「加入我的收藏」時導向登入，登入後回到匯入預覽（token 保留於路由）。

### D4：匯入為複製語意

匯入時以**新的隨機 id**、**匯入者的 `user_id`** 建立一筆新的 `user_backgrounds` 列，內容取自快照。

- 匯入後與來源完全脫鉤：原作者撤銷分享或修改內容，都不影響已匯入的那一份
- 重複匯入同一個 token 會產生第二份——UI SHALL 在偵測到同名同版本的既有項目時提示，由使用者決定是否仍要匯入
- 快照 `data` 為不可信輸入：匯入前 SHALL 以與「使用者手動建立」相同的規則驗證（欄位白名單、長度上限、列舉型欄位須在合法集合內），驗證失敗則拒絕匯入並說明原因
- **驗證的嚴格度須與手動建立對齊，不可更嚴**：自訂背景的起源專長允許自由填寫（見 `custom-origin-feat`），匯入時若仍要求它落在 SRD 候選內，會出現「自己建得出來、卻分享不出去」的矛盾

### D5：無列舉介面——這是規格層的約束，不只是「暫時沒做」

App SHALL NOT 提供任何列舉、瀏覽、搜尋已分享內容的介面；前端一律以 token 精確查單列。資料庫層亦不建立支援此類查詢的公開路徑。

- **理由**：點對點傳遞時 App 是傳輸工具，使用者自產內容不受 SRD 限制（content-scope 政策明文：政策排除的是官方出版內容，非使用者內容）。但一旦提供可瀏覽的公開索引，App 的角色就變成內容散布平台——屆時使用者上傳抄錄自官方出版品的內容，責任歸屬完全不同。這條線的成本是「現在不做一個功能」，跨過去的成本是「整個內容政策要重新設計」，不對稱。
- 因此寫成 `SHALL NOT` 而非「暫不實作」，讓未來要跨線時必須經過一次明確的規格變更。

### D6：連結與 QR 為同一個 URL 的兩種呈現

分享連結為 `https://<web-domain>/s/<token>`。QR code 內容即該 URL（22 字元 token + 網域，遠低於任何容量限制）。

- 已裝 App：universal link（iOS）／app link（Android）直接開 App 的匯入頁
- 未裝 App：落到 web 版的同一個匯入頁（web 部署已存在）
- QR 產生為純本機繪製（無網路、無第三方服務）

### D7：規則版本隨快照走

快照帶 `rules_version`。匯入時若與匯入者當下的情境不符（例如 5e 的背景要匯入給 5r 使用），SHALL 阻擋並說明，不做任何自動轉換——與 `dual-rules-version` 的「版本不可變更、不跨版混用」一致。

## Risks / Trade-offs

- **capability URL 外流**：token 一旦被轉貼到公開場合，任何人都能讀。→ 這是 capability 模型的本質；緩解為提供撤銷，並在分享 UI 明示「持有連結者皆可檢視」。內容為使用者自願發布的遊戲設定，風險等級可接受。
- **快照與原始列分歧**：作者改了自己的背景，舊連結仍是舊內容。→ 這是刻意的語意（D1）。緩解：分享 UI 顯示該 token 的發布時間，並提供「重新發布」產生新 token。
- **孤兒快照累積**：使用者發布後遺忘，資料列永久留存。→ 首版接受；若成本浮現，再加保留期或發布上限（屬營運調整，不需改規格）。
- **匯入重複**：同一份被反覆匯入產生多份同名項目。→ D4 的同名提示；不做強制去重，因為使用者可能刻意要兩份來改成不同版本。
- **與 `dual-rules-version` 的排序相依**：規則版本檢查需 `CustomBackground.rulesVersion` 就位。→ 實作時先做不含版本檢查的部分，版本欄位就緒後再補；或直接排在該 change 階段二之後。
- **不可信輸入**：快照 `data` 來自他人。→ D4 的驗證；文字一律以純文字呈現，不進入 5etools 標記渲染路徑（外來字串不應能觸發內容庫交叉引用）。

## Migration Plan

**新增**：一支 migration 建立 `shared_homebrew` 表、索引與 RLS 政策。純新增，不動既有表。

**既有資料**：無需遷移。既有 `CustomBackground` 的時間戳 id 原樣保留（id 僅為識別，不參與分享）；僅新建者改用隨機 id。

**Rollback**：
- App 端：回退版本即可，分享入口消失，已建立的 `shared_homebrew` 列成為無人存取的孤兒
- 資料庫：`drop table public.shared_homebrew`（僅影響已發布的分享連結，使用者的原始 homebrew 完全不受影響）
- 為單向門的部分：無。本 change 的所有變更皆可逆。

## Open Questions

1. 分享連結的網域路徑用 `/s/<token>` 還是其他前綴？需與既有 go_router 路由不衝突，且 universal link 的 `apple-app-site-association` 路徑比對要涵蓋。
2. 撤銷後他人再開連結的呈現：顯示「此分享已撤銷」還是通用的「找不到內容」？前者較友善但洩漏「這個 token 曾經存在」，後者較保守。傾向前者（風險極低）。
3. 是否要在快照中記錄發布者的顯示名稱？有助於接收方辨識來源，但引入使用者資料外洩面（目前 `shared_homebrew` 只有 `owner_id` 供 RLS 用，不對外回傳）。傾向不記錄，由分享者自行在對話中說明。
4. 首版是否需要「我發布過的分享」管理清單？這與 D5 的「無列舉介面」不衝突（列舉的是自己的，非他人的），但增加首版範圍。傾向首版僅在自訂背景項目上顯示其分享狀態與撤銷入口。
