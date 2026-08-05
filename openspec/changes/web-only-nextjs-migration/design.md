## Context

背景與實測數據見 proposal。**本設計已由絞殺者（strangler fig）改為 clean-slate 全面重寫**——絞殺者的全部機制（catch-all 路由分流、雙建置產物合併部署、Dart/JS session 相容、雙軌功能歸屬政策）存在的唯一理由是保護既有使用者不中斷服務，而目前規模不需要支付這筆保費。

已驗證的現況（決定重寫難度，勿重新臆測）：

- **使用者確實存在但規模極小**：`user_characters` 有 11 個帳號、21 筆存活角色，最舊建於 2026-07-02，均為使用者本人與朋友的測試資料。測試人員已知會，**資料可於切換時清除**
- **回填鏈幾乎是死碼**：21 筆中 **0 筆**有舊版靜態 `weapons` 清單，僅 **1 筆**缺職業資源。`migrateLegacyWeapons` 對現存資料完全不觸發
- 後端零改動：`get_shared_character(p_token)` 等 RPC、RLS、schema 原樣沿用。`user_characters` 主鍵為複合的 `(user_id, id)`
- Flutter 端資產：手寫 Dart 25,752 行／102 檔，250 個測試；規則邏輯集中在 `derived_stats`、`currency_math`、`level_up`、`class_resources`
- 舊 service worker 已註冊於這些使用者的瀏覽器，scope 為 `/`

## Goals / Non-Goals

**Goals:**
- 以 Next.js 全面取代 Flutter web，取得 SSR、SEO、社群預覽與約 15 倍的首次載入改善
- 新型別定義能解析全部 21 筆真實資料（切換前的驗收門檻；資料本身不需保留至切換後）
- 規則邏輯的正確性不因重寫而退步
- 不留半死不活的雙軌狀態

**Non-Goals:**
- 保持服務不中斷（明確接受一次性切換與重新登入）
- 後端變更
- 產品功能擴充——重寫是換交付方式，不是改產品。新功能一律等重寫完成

## Decisions

### D1：原生程式碼刪除，不保留「停止建置」的中間態

`git rm -r ios/ android/`，連同 `web/.well-known/apple-app-site-association`、`assetlinks.json`、iOS entitlements 的 Associated Domains 一併移除。刪除前打標籤（例如 `native-final`），使日後取回有明確起點。

**否決「保留但停止建置」**：無人建置、無人測試的設定會隨相依升級腐爛。`ios/Runner.xcodeproj/project.pbxproj` 與 `ios/Podfile.lock` 已經有未進版控的變動懸置多日，正是這種中間態的實例——既沒被使用，也沒被了結，只持續產生雜訊。

### D2：Flutter 停止部署但留在 repo，作為參考實作

Next.js 為唯一的部署目標。Flutter 專案不刪，但不再建置、不再接受新功能。

留著的理由是**對照**：重寫每一頁時，並排開兩個視窗比對行為，遠比翻程式碼推敲規格快。等 Next.js 版全面追平，再以獨立的 commit 刪除 `lib/`——那時它已無資訊價值。

**否決「立刻刪除 Flutter」**：省下的只是 repo 體積，付出的是整個重寫期間失去唯一可信的行為基準。

### D3：舊 service worker 必須主動註銷

Flutter 的 SW 註冊於 scope `/`，會攔截同網域的新站並回舊資產。使用者雖少但確實存在，且他們的瀏覽器裡已註冊。

Next.js 的根版面加入一次性註銷（`getRegistrations()` → `unregister()`），並在重寫完成、確認無人回報舊畫面後移除。這段程式碼從第一次部署就要在，否則朋友們會看到「網站沒變」而回報假故障。

### D4：接受一次性登出，不做 session 相容

`supabase_flutter` 與 `@supabase/supabase-js` 的 session 儲存鍵與格式不同。做相容轉換的成本，只為了省下 11 個人各按兩下 OAuth——不划算，且那段相容碼之後還要清掉。

切換時在登入頁說明即可。

### D5：Flutter 端功能凍結，待實作的 change 全部擱置

`custom-species`（39 項）、`homebrew-share`（33 項）、`dual-rules-version`（2/45）、`offline-character-cache` 一律**不在 Flutter 端實作**。在即將退場的程式碼上開發，是純粹的浪費。

它們的 proposal 與 design 保留——那些是產品判斷，與實作語言無關，重寫完成後可直接接續。

這是與絞殺者版本最大的政策反轉：當時因為雙軌期會拖長，主張新功能續寫 Flutter；clean-slate 沒有雙軌期，凍結才是對的。

### D6：不移植回填鏈；舊資料留到切換時才清

實測 21 筆存活角色中 **0 筆**含舊版 `weapons` 清單，`migrateLegacyWeapons` 對現存資料完全不觸發；且測試資料可於切換時清除。因此**不移植回填鏈**，新實作只面對當前格式。

這條鏈在 Flutter 端反覆滲透到多個讀取路徑（雲端讀取、分享讀取、原本規劃的快取讀取），是持續的複雜度來源。趁重寫一次結清，比原封不動搬過去有價值得多。

**但重寫期間資料不清除**：那 21 筆是唯一的真實解析素材，用來驗證新的型別定義吃得下真實 JSON，比自捏樣本可信得多。清除排在切換上線，demo 角色屆時以 `tool/seed_demo_characters.dart` 的等效實作重灌。

清除時必須**帶 `user_id` 並先 select 確認影響範圍**——該表是多租戶的，曾因未限定而誤刪 10 位使用者的資料。

### D7：規則邏輯以 golden 對拍移植，且必須先於頁面

`derived_stats`（AC 推導）、`currency_math`（分層扣款）、`level_up`、`class_resources` 編碼的是 D&D 規則，目前由 250 個測試釘著。失敗模式不是「寫不出來」，而是「看起來對、但特定情境算錯」——玩家不會回報，只會默默失去信任。

作法：自 Flutter 端匯出涵蓋邊界的輸入／輸出對照（golden file），Next.js 端的實作逐項對上。

**順序上必須先做**：頁面依賴這些推導值，規則層未定就寫頁面，等於在流沙上蓋房子。這也與 clean-slate 的一次性風險相稱——沒有並行雙軌可以當安全網。

### D8：離線與 PWA 於重寫完成後再建

重寫期間不做 SW。完成後在 Next.js 端以 Workbox 之類的成熟方案建立，取代 Flutter 每次建置重新產生、無法客製的 `flutter_service_worker.js`。

`offline-character-cache` 屆時以 Next.js 為前提重寫 design：原生儲存段落刪除，其餘判斷（快取優先、本機優先的衝突處理、登出清角色不清內容庫、空狀態四分流）原樣沿用。

### D9：頁面依相依性排序，而非獲客價值

絞殺者版本依獲客價值排（分享頁優先），因為每一步都要獨立上線、獨立衡量。clean-slate 是一次切換，沒有中途上線，排序改依**相依性**：

1. 設計 token、Supabase 接線、auth
2. 規則邏輯 ＋ golden 對拍（D7）
3. 角色卡唯讀呈現（分享頁與自有角色共用同一套呈現元件）
4. 建角流程
5. 編輯與戰鬥介面
6. 內容庫瀏覽、日誌、自訂背景

分享頁因為與第 3 項共用呈現元件，落在同一階段，不需另外排。

### D10：部署採 OpenNext，目標由 Pages 改為 Workers

`@cloudflare/next-on-pages` **已正式棄用**，npm 上的 deprecated 訊息直接指向
OpenNext（`Please use the OpenNext adapter instead`）。無須實測比較——選項只剩
一個。採 `@opennextjs/cloudflare`。

**連帶的架構改變**：OpenNext 產出的是 Worker（`.open-next/worker.js`）＋靜態
資產綁定，不是 Pages 的目錄產物。因此**部署目標由 Cloudflare Pages 改為
Workers**，現行的 `lorebook` Pages 專案於切換上線後退場。部署指令也隨之改變
（`wrangler deploy`，不再是 `wrangler pages deploy`）。

已實地驗證（spike worker 部署後即刪除，避免留下公開端點）：

| 驗證項 | 結果 |
|---|---|
| SSR 在 Workers 上執行 | ✓ curl 不執行 JS 即見完整內容 |
| 伺服器端呼叫既有 RPC | ✓ `get_shared_character` 以 anon key 直接可用 |
| 邊緣端 TTFB（含 RPC） | 0.37–0.46 s（5 次取樣） |
| RPC 往返 | 263 ms（自 Cloudflare 邊緣；本機測時為 1182 ms） |

**不啟用樣板預設的 R2 增量快取**：本站沒有 ISR 需求——分享頁必須是即時活資料
（character-share 規格），角色頁是登入後的動態內容。加了只是多一個會壞的地方。

**建置工具鏈的 undici 警告可接受**：`wrangler@4.118.0`（已是最新）鎖
`miniflare@5-alpha`，後者帶有 advisory 的 `undici@7.28.0`，`npm audit fix` 無法
在不降級工具鏈的前提下修復。已確認該套件**不在部署產物內**（`.open-next` 的
server function 之 node_modules 無 undici；Next.js 自身程式碼中的 undici 字串
是另一回事）。

### D11：中文走系統字型，不下載中文字型檔

**原規劃（tasks 3.4 的「woff2 ＋ unicode-range 分片」）經實測推翻。**

Google Fonts 的 Noto Serif TC 依**字碼區段**而非使用頻率切片，任何一段中文都
會散落在十幾片上。以真實角色資料實測（2026-08-05）：

| 情境 | 相異中文字 | 命中分片 | 字型傳輸 |
|---|---|---|---|
| 整張角色卡（含全部特性說明） | 366 | 44 / 225 | 3,375 KB |
| 只有標題類 | 30 | 18 | 1,582 KB |
| 只有角色名／種族／職業 | **11** | 16 | **1,397 KB** |

11 個字要 1.4 MB——與 Flutter 版整份 4.09 MB 相比只省兩成，等於白搬。切片方案
對稀疏中文無效，這是 Google 的切片策略決定的，不是設定問題。

**改為系統中文字型堆疊，0 bytes。** 每台裝置都內建中文字型。拉丁字型（Cinzel
標題、Source Sans 內文）維持自我託管——切片有效、體積小，一頁只需 53 KB。

代價是失去 Noto Serif 的特定中文字面。**這是視覺與效能的直接取捨，而效能是
整個重寫的理由**：為那個字面付 1.4 MB，等於放棄重寫的目的。古書感的主要來源
（Cinzel 標題、金／暗色調、版面密度）完整保留。

若日後判定中文字面非保不可，可行的替代是自我託管一份 pyftsubset 切到常用
字集的 Noto Serif TC，但即使切到 5000 字仍是 MB 級，且罕用字（角色名、玩家
自訂內容）會掉字——不建議。

## Risks / Trade-offs

- **一次性切換，沒有回退到部分完成狀態的餘地** → Flutter 版留在 repo（D2），最壞情況是重新部署舊版；但那需要恢復 SW 設定，不是零成本
- **規則邏輯重寫出現靜默錯誤** → D7 的 golden 對拍是主要防線；覆蓋率不足的部分要明確列出，不假裝全蓋到
- **重寫期間產品完全停滯** → 已接受。壓縮時程比中途插功能實際
- **舊 SW 導致朋友看到舊畫面並回報假故障** → D3 的註銷程式碼從第一次部署就在；切換時主動告知
- **新型別定義吃不下真實 JSON** → 以全部 21 筆真實資料跑全量解析驗證，不只測樣本；這是保留舊資料到切換前的主要理由
- **Next.js 端的 Supabase 金鑰暴露面** → SSR 一律用 anon key；分享頁沿用 `get_shared_character` RPC，該函式已是唯一授權點。**service role key 不得進入任何前端可達路徑**
- **spike 的 2.5 KB 不是分享頁的最終體積** → 該頁幾乎無樣式、無字型、無 hydration。加上拉丁字型（約 53 KB，見 D11）、CSS 與 client JS，合理預期落在 150–300 KB。與 Flutter 的 7.8 MB 相比仍是一到兩個數量級的差距，但不應以 2.5 KB 對外表述
- **中文以系統字型呈現，各平台字面不一致** → macOS 走蘋方、Windows 走微軟正黑，字面與字重略有差異。已接受（D11）；若某平台的呈現明顯崩壞再個別處理

## Migration Plan

1. 打標籤 `native-final`，移除 `ios/`、`android/` 與原生設定，更新 CLAUDE.md
2. Golden 對照匯出（D7）與真實資料快照（D6）
3. Next.js 基礎：部署方案、設計 token、Supabase 接線、auth
4. 規則邏輯移植並逐項對上 golden
5. 頁面依 D9 順序移植
6. 以真實資料全量驗證解析與呈現
7. 切換部署目標；清除測試資料並重灌 demo；舊 SW 註銷生效；通知使用者重新登入
8. 觀察一段時間後刪除 `lib/`，移除註銷程式碼

回退：步驟 7 之前隨時可停——線上仍是 Flutter 版。步驟 7 之後回退需重新部署 Flutter 並恢復其 SW 設定。

## Open Questions

~~Next.js 的 Cloudflare 部署方案~~ **已於 2026-08-05 定案，見 D10。**
- 設計 token 自 Flutter theme 抽出的形式：手動移植一次，還是產生器？一次性重寫的話手動即可，但要確保色票不漂移
- 狀態管理選型：Zustand＋TanStack Query，或 Server Components 為主、client state 最小化？後者更能發揮 Next.js，但編輯與戰鬥介面是重度 client state
- 既有分享 token 是否保留？路徑 `/v/:token` 不變即可相容，但需確認 Next.js 端的 RPC 呼叫與現行行為一致
~~內容庫瀏覽頁的分頁策略~~ **已定案：不分頁，全部條目一次渲染。** 實測法術頁
  1,182 KB 原始／gzip 後 180 KB，物品頁 412 KB／44 KB。換到的是「⌘F 搜得到
  全部」與「不需 JS 即可瀏覽」——對一份查詢用的參考資料，那比分頁重要；分頁
  反而讓「這個效果在哪個法術」變難查。代價是法術頁的 TTFB 約 1.5 秒（每次請求
  查 339 列）；若成為瓶頸，正解是邊緣 Cache-Control 而非分頁——內容庫是公開
  資料，邊緣快取沒有外洩風險
