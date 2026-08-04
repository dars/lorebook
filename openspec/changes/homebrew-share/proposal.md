## Why

SRD 收斂後內建選項本就不多，切到 5e（SRD 5.1）後更極端——**背景只有 1 個（侍僧）、專長只有 1 個（擒抱者）**。使用者自訂內容（homebrew）是唯一的補足途徑，但目前每個玩家都得自己從頭建一次：同一團要用「士兵」背景，五個人就要各建五次，且內容不會一致。

現況的 homebrew 完全無法傳遞：`user_backgrounds` 為 own-row RLS（`auth.uid() = user_id`）且 `revoke all from anon`，其他使用者拿到 id 也查不到任何列。而現行的 `CustomBackground.id` 是 `DateTime.now().microsecondsSinceEpoch` 時間戳（可枚舉），不具備作為分享識別碼的安全性。

本 change 讓玩家能把自訂內容以 QR code 或連結分享給同團成員，對方確認後複製成自己帳號的一份。

## What Changes

- 新增 `shared_homebrew` 快照表：發布時將自訂內容的**當下快照**寫入，以不可猜的隨機 token（128-bit）識別；原始資料列維持完全私有不變
- 發布為使用者的明確動作；已發布內容可撤銷（`revoked_at`），撤銷後連結即失效
- 分享載體為連結與其 QR code（同一個 URL 的兩種呈現）；QR 內容僅為短網址，不含資料本體，因此**不受 payload 長度限制**，未來的自訂職業等大型內容同樣適用
- 分享連結可由**未登入者讀取**（anon select）：掃碼者未裝 App、未登入亦可於 web 版預覽內容；**匯入**（存成自己的一份）才要求登入
- 匯入為**複製語意**：以新 id、自己的 `user_id` 建立新資料列；匯入後與原作者的內容互不影響
- 分享 payload 攜帶規則版本（`rules_version`），匯入時版本不符 SHALL 阻擋並說明
- **SHALL NOT** 提供任何列舉、瀏覽或搜尋已分享內容的介面——分享僅為點對點傳遞，App 不成為內容散布平台
- `CustomBackground` 的 id 產生方式改為隨機（既有時間戳 id 相容保留，僅新建者改變）

首版範圍為**自訂背景**（現有唯一的 homebrew 型別）；快照表以 `kind` 欄位設計為可容納後續 homebrew 型別（種族／專長／法術／職業），無需再次 migration。

## Capabilities

### New Capabilities
- `homebrew-share`: 自訂內容的分享與匯入——發布快照、token 識別、QR/連結載體、撤銷、匯入為複製、規則版本檢查、無公開索引

### Modified Capabilities
- `custom-backgrounds`: 新增「發布分享」與「自匯入建立」兩條路徑；id 產生方式改為隨機
- `content-scope`: 明確界定使用者自產內容的分享邊界——點對點傳遞不受 SRD 限制，但 App SHALL NOT 提供公開索引或內容散布介面
- `data-layer`: 新增一張非 own-row RLS 的資料表（token 可讀），需明文其存取模型與既有 own-row 慣例的差異

## Impact

**資料層分類**：影響「角色卡資料」層旁的使用者自產內容（homebrew），不觸及靜態遊戲資料（內容庫）與 Campaign 共用資料；無 Realtime 訂閱異動。

- **新資料表 `shared_homebrew`**（App 自有 Supabase 專案）：
  | 欄位 | 型別 | 說明 |
  |---|---|---|
  | `token` | `text primary key` | 128-bit 隨機（base64url），分享識別碼；非原始資料 id |
  | `kind` | `text not null` | `background`（首版）／未來 `species`/`feat`/`spell`/`class` |
  | `rules_version` | `text not null` | `5e` / `5r` |
  | `data` | `jsonb not null` | 發布當下的內容快照 |
  | `owner_id` | `uuid not null` | 發布者，`references auth.users` |
  | `created_at` | `timestamptz not null` | |
  | `revoked_at` | `timestamptz` | 非 null = 已撤銷 |

  RLS：`select` 開放 `anon` 與 `authenticated`，條件 `revoked_at is null`（**憑 token 存取**，非 own-row）；`insert` / `update`（撤銷）限 `owner_id = auth.uid()`。**無任何允許列舉的查詢路徑**：不建立可依 `owner_id` 或時間排序的公開查詢介面，前端一律以 token 精確查單列。

- **既有表**：`user_backgrounds` 不變（欄位、RLS、grant 皆不動）。

**程式碼影響**：

- 新增 `lib/features/character/data/homebrew_share_repository.dart`（發布、撤銷、依 token 取回）
- 新增分享 UI（自訂背景清單／編輯頁的分享入口、QR 顯示、撤銷）與匯入頁（預覽 → 確認 → 複製）
- `lib/app/router.dart`：新增匯入路由（可由 deep link 進入）
- `lib/features/character/domain/custom_background.dart`：id 產生改隨機
- `lib/features/character/presentation/custom_background_edit_page.dart`：id 產生點（現為 `DateTime.now().microsecondsSinceEpoch`）

**版型影響**：手機與平板皆有；QR 顯示與匯入預覽為新畫面，沿用既有 `ResponsiveLayout` 級距，無新版型分支。

**相依**：需新增 QR code 產生套件（純繪製、無網路，如 `qr_flutter`）；deep link 需設定 universal link / app link 的 domain 驗證檔（web 部署 `lorebook-1om.pages.dev` 已存在）。不引入其他第三方服務。

**與 `dual-rules-version` 的關係**：本 change 依賴其定義的 `rulesVersion`（`CustomBackground.rulesVersion` 與版本識別碼），需待該 change 的階段二完成後才能實作規則版本檢查；其餘部分可並行。
