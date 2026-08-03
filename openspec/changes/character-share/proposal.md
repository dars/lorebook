## Why

跑團當下，DM 與隊友常需要看別人的角色卡：DM 要確認被動察覺、AC、豁免加值來判定，隊友要知道誰帶了繩子、誰還能施幾環法術。現況只能口頭報數字或傳截圖——截圖一扣血就過期，口頭問答則打斷節奏。

但現況在資料庫層完全走不通：`user_characters` 為 own-row RLS（`auth.uid() = user_id`）且 `revoke all on public.user_characters from anon`，把角色 id 給對方，對方查到的是空集合。要讓他人讀到，必須新增一條受控的授權讀取路徑。

## What Changes

- 新增 `character_shares` **授權表**：以不可猜的隨機 token 記錄「某使用者的某角色可被憑此 token 檢視」，含撤銷欄位；`user_characters` 的欄位、RLS、grant 完全不動
- 憑 token 取回的是**即時活資料**：每次開啟都讀 `user_characters` 當下的內容，HP、裝備、等級變動立即反映；不做快照，不需要重新發布
- 讀取走 `SECURITY DEFINER` Postgres 函式，驗證 token 有效（未撤銷、來源角色未軟刪除）後回傳角色文件；**不對 `user_characters` 新增任何 anon grant 或放寬 policy**
- 分享的生效與失效**全由使用者手動控制**：首版不做有效期限，分享後持續有效直到擁有者撤銷
- 一個角色可同時存在多個 token（分別給 DM 與各隊友，可個別撤銷、個別標註用途）
- 分享載體為連結與其 QR code；已裝 App 走 universal link / app link 開啟 App 內檢視頁，未裝 App 落到 web 版同一頁
- 檢視者**免註冊、免登入**即可檢視（內容庫本就 anon 公開唯讀，法術與職業特性等交叉引用皆可正常渲染）
- 檢視為**純唯讀**：重用既有角色卡五個 tab 的唯讀版本，所有編輯入口、擲骰與消耗操作一律不出現
- 角色主人可在 App 內查看自己已發出的分享清單並逐一撤銷；撤銷後連結立即失效
- **SHALL NOT** 提供任何列舉、瀏覽或搜尋他人分享角色卡的介面——分享僅為點對點傳遞

## Capabilities

### New Capabilities
- `character-share`: 角色卡的唯讀分享——建立／撤銷分享 token、憑 token 讀取活資料、連結與 QR 載體、唯讀檢視頁、失效態呈現、無公開索引

### Modified Capabilities
- `data-layer`: 新增第三種存取模型的慣例——「授權表 ＋ `SECURITY DEFINER` 函式代查活資料」，有別於既有的 own-row RLS，也有別於 `homebrew-share` 的 token 快照表；需明文其約束（不放寬原表權限、函式須自行驗證所有失效條件、無列舉路徑）
- `character-management`: 角色卡新增「分享」入口與唯讀檢視模式；唯讀模式下 SHALL NOT 呈現任何編輯／擲骰／消耗操作
- `routing`: 新增分享檢視路由，且該路由 SHALL 豁免 auth redirect guard（未登入亦可停留），並可由 deep link 直接進入

## Impact

**資料層分類**：影響「角色卡資料」層——新增一條讀取路徑，不改變寫入路徑，不觸及靜態遊戲資料（內容庫）與 Campaign 共用資料。**無 Realtime 訂閱異動**：檢視頁於開啟／手動重新整理時抓取最新資料，首版不建立訂閱。

- **新資料表 `character_shares`**（App 自有 Supabase 專案）：
  | 欄位 | 型別 | 說明 |
  |---|---|---|
  | `token` | `text primary key` | 128-bit 密碼學安全隨機（base64url，22 字元）；非角色 id 推導 |
  | `owner_id` | `uuid not null` | 角色擁有者，`references auth.users (id) on delete cascade` |
  | `character_id` | `text not null` | 對應 `user_characters.id`（該表主鍵為 `(user_id, id)`，故需兩欄一起指向） |
  | `label` | `text` | 分享對象備註（如「DM」「小明」），供擁有者辨識，不對檢視者回傳 |
  | `created_at` | `timestamptz not null` | |
  | `revoked_at` | `timestamptz` | 非 null＝已撤銷 |

  首版**不含有效期限欄位**：分享後持續有效直到手動撤銷。日後若要加，為純附加的 migration（新增 nullable `expires_at` ＋ 函式多一條判斷），不需遷移既有資料。

  RLS：`select` / `insert` / `update`（撤銷）／`delete` 皆限 `owner_id = auth.uid()`，且 `revoke all from anon`——**此表本身完全不對外可讀**，檢視者不查此表。

- **新 Postgres 函式**（`SECURITY DEFINER`，`set search_path = ''`，授權 `anon` 與 `authenticated` 執行）：以 token 為唯一參數，驗證未撤銷、來源角色存在且 `deleted_at is null` 後，回傳該角色的文件內容；任一條件不成立則回傳可區分的失效狀態。函式 SHALL NOT 回傳 `owner_id`、`label` 或任何其他分享的存在資訊。

- **既有表**：`user_characters` 不變（欄位、RLS、grant 皆不動）；`portraits` bucket 不變（本就是 public bucket，檢視者經 public URL 取圖即可）。

**程式碼影響**：

- 新增 `lib/features/character/data/character_share_repository.dart`（建立分享、列出自己的分享、撤銷、憑 token 取回角色）
- 憑 token 取回的角色 SHALL 套用與 `CharacterSyncRepository.fetchAll()` 相同的回填（`migrateLegacyWeapons`、`backfillClassResources`），否則舊角色在檢視端顯示不全
- 新增分享管理 UI（角色卡分享入口、QR 顯示、已發出分享清單與撤銷）與唯讀檢視頁（重用 `lib/features/character/presentation/tabs/` 的五個 tab）
- `lib/app/router.dart`：新增檢視路由並將其加入 auth redirect guard 的豁免清單
- 既有 tab widget 需能接受「唯讀」模式參數；目前資料來源綁定 `currentCharacterProvider`，需可改以傳入的角色物件驅動

**版型影響**：手機與平板皆有。檢視頁沿用既有 `ResponsiveLayout` 級距與角色卡現有排列，無新版型分支；QR 顯示為新畫面。

**相依**：需新增 QR code 產生套件（純本機繪製、無網路，如 `qr_flutter`）；deep link 需設定 universal link / app link 的 domain 驗證檔（web 部署 `lorebook-1om.pages.dev` 已存在）。不引入其他第三方服務。

**與 `homebrew-share` 的關係**：兩者為**獨立的兩套機制**，不共用資料表、不互為前提。homebrew 分享的是內容定義的**快照複製**（匯入後兩邊各自獨立）；角色卡分享的是**活資料的持續授權**（撤銷即斷）。兩者的路徑前綴需錯開（homebrew 為 `/s/<token>`）。兩個 change 各自對 `data-layer` 新增**不同標題**的 requirement，delta 不重疊，可各自獨立 archive。
