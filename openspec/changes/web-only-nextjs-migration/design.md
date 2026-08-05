## Context

背景與實測數據見 proposal。這裡只記錄實作上的約束與取捨。

四項已驗證、且會左右設計的現況：

- **Supabase session 在兩個 client 之間預設不相容**。`lib/main.dart:42` 以預設選項呼叫 `Supabase.initialize`，`supabase_flutter` 因而使用預設的 `SharedPreferencesLocalStorage`；在 web 上經 `shared_preferences` 落到 localStorage 的 `flutter.SUPABASE_PERSIST_SESSION_KEY`。而 `@supabase/supabase-js` 預設寫在 `sb-<project-ref>-auth-token`，格式也不同。**兩邊看不見彼此的登入狀態**
- **Flutter 的 service worker 註冊於 scope `/`**，會攔截同網域下的所有路徑，包含已遷移到 Next.js 的路由，並以快取的舊資產回應
- **`offline-character-cache` 尚未實作**——目前本機沒有任何離線資料可失去
- 部署為手動 wrangler 兩步，git push 不會部署（Pages 的 GitHub 檢查會謊報成功）

## Goals / Non-Goals

**Goals:**
- 每一步遷移都能單獨上線、單獨衡量、隨時喊停
- 遷移期間使用者無感：不重複登入、不遇到路由黑洞、不看到兩套不一致的視覺
- 規則邏輯（AC 推導、分層扣款、升級、職業資源）最後才動，且動的時候有對拍依據
- 原生移除是乾淨的一刀，不留半死不活的設定檔

**Non-Goals:**
- 第 2–4 步的路由遷移
- 後端變更
- 視覺重新設計——遷移是換交付方式，不是改產品

## Decisions

### D1：原生程式碼刪除，不保留「停止建置」的中間態

`git rm -r ios/ android/`，連同 `web/.well-known/apple-app-site-association`、`assetlinks.json`、iOS entitlements 的 Associated Domains 一併移除。git 歷史保有全部內容，需要時 `git revert` 或自標籤取回。

**否決「保留但停止建置」**：那會留下一份沒人跑、沒人測、隨 Flutter 升級逐漸腐爛的設定。目前 `ios/Runner.xcodeproj/project.pbxproj` 與 `ios/Podfile.lock` 已經有未進版控的變動懸在那裡好幾天，正是這種中間態的實例——它既沒有被使用，也沒有被了結，只是持續產生雜訊。一刀切乾淨，比留著一個「說不定哪天會用」的空殼誠實。

刪除前先打一個 tag（例如 `native-final`），讓「取回」有明確的起點而不是翻 log。

### D2：Next.js 為主體，Flutter 退居 catch-all

單一 Cloudflare Pages 專案。Next.js 為部署根，Flutter 的 `build/web` 產物置於其靜態資產下；Next.js 未匹配的路徑一律 rewrite 至 Flutter 的 index.html。

方向很重要：**新的當主體、舊的當 fallback**。反過來（Flutter 為主、特定路由轉給 Next.js）會讓每遷移一條路由就要改一次分流規則，而且退場時還要再拆一次。以 Next.js 為主體則是「遷一條、少一條 fallback」，最後 fallback 自然歸零，Flutter 無聲退場。

**否決「兩個 Pages 專案 ＋ 前置 Worker 分流」**：多一層跳轉、多一個部署目標、多一處會壞的地方，換到的只是建置隔離——而建置本來就是兩個指令，沒有隔離問題。

### D3：遷移期間關閉 Flutter 的 service worker

以 `--pwa-strategy=none` 建置 Flutter web。

理由是時機：`offline-character-cache` 尚未實作，**現在本機沒有任何離線資料可失去**，SW 目前唯一的實質作用是重複造訪的載入加速。用這個代價換取遷移期的可預測性，是這段期間最划算的交易——否則舊 SW 會以 scope `/` 攔截已遷移的路由並回舊資產，而這種故障極難診斷（使用者看到的是「新頁面偶爾變回舊的」）。

已上線的舊 SW 不會因為新建置不註冊就消失，必須**主動註銷**：在 Next.js 的根版面加入一次性的 `getRegistrations().then(rs => rs.forEach(r => r.unregister()))`。這段程式碼在遷移完成後移除。

離線能力於遷移完成後在 Next.js 端重新建立（見 D7）。

剛完成的 `AppUpdateGate`（`lib/shared/presentation/app_update/`）在 SW 關閉後不再有訊號可監聽，等同停用。這是預期的——它解決的是 Flutter SW 的快取問題，那個問題隨 SW 一起消失。

### D4：Dart 端改用 JS 相容的 session 儲存格式

給 `Supabase.initialize` 傳入自訂 `LocalStorage` 實作，讀寫 `sb-<project-ref>-auth-token` 這個鍵、並採 supabase-js 的 JSON 形狀。

**方向是讓「即將退場的那一邊」去適應「留下來的那一邊」**。反過來讓 Next.js 去讀 `flutter.SUPABASE_PERSIST_SESSION_KEY`，等於把遷移的痕跡永久烙進最終要保留的程式碼裡——Flutter 退場後那段相容碼會變成沒人懂的考古層。

需注意既有使用者的 session 落在舊鍵上，切換當下會被登出一次。可在首次啟動時做一次性搬遷（讀舊鍵、寫新鍵、刪舊鍵），或接受一次重新登入——**建議接受重新登入**：登入只是 OAuth 兩下，而搬遷程式碼是另一段之後要清掉的暫時性邏輯。

### D5：遷移期間的新功能一律寫在 Flutter，例外需明示

除非該功能所屬的路由正在被遷移，否則新功能寫 Flutter。

理由：Next.js 端目前只有分享頁，缺乏元件庫、狀態管理、規則邏輯；在那裡開新功能等於同時付遷移成本與開發成本。而 Flutter 端該功能日後隨其路由一起遷移，屆時是「照著已驗證的實作重寫」，比「憑規格重新設計」風險低得多。

受此政策約束的既有 change：`custom-species`、`homebrew-share`、`dual-rules-version` 全部繼續在 Flutter 端實作。

### D6：`offline-character-cache` 延後至遷移完成，並縮減範圍

該 change 目前規劃 web 用 IndexedDB、原生用 `path_provider`——原生那半在 web-only 之後直接失效。更關鍵的是，離線快取服務的是**編輯與戰鬥介面**，而那是遷移的最後一步；在 Flutter 端實作它，等於寫一套注定隨 Flutter 一起退場的程式碼。

建議：`offline-character-cache` 維持提案狀態不實作，待編輯介面遷移完成後，以 Next.js 的前提重寫其 design（原生儲存段落刪除，SW 策略與 D7 合併）。

### D7：離線與 PWA 於遷移完成後重建，不在期間維持

遷移期間沒有 SW（D3），因此沒有離線、沒有 A2HS 的安裝價值。這是明確接受的空窗。

在 Next.js 端重建時可用 Workbox 之類的成熟方案，取代 Flutter 自動產生的 `flutter_service_worker.js`——後者每次建置重新產生、無法客製，正是先前踩過的坑。

### D8：規則邏輯以 golden test 對拍，不憑規格重寫

`derived_stats`（AC 推導）、`currency_math`（分層扣款）、`level_up`、職業資源推導這幾支編碼的是 D&D 規則，目前有 250 個測試釘著。重寫時的風險不是「寫不出來」，而是「寫出來看起來對、但某場戰鬥算錯 AC」——這種錯誤玩家不會回報，只會默默降低信任。

作法：在遷移那些邏輯之前，先自 Flutter 端匯出一組涵蓋邊界的輸入／輸出對照（golden file），Next.js 端的實作必須逐一對上。這件事屬於第 4 步，本 change 只確立方針並產出第一份匯出工具的規格。

## Risks / Trade-offs

- **舊 SW 殘留攔截已遷移路由** → D3 的主動註銷；上線後以無痕視窗與既有 profile 分別驗證
- **session 切換造成全體使用者登出一次** → D4 已接受；上線時機避開跑團尖峰，並在登入頁說明
- **兩套 UI 的視覺不一致** → 分享頁是唯讀且獨立的入口，不與主 app 並排出現；但色票、字級、間距需自 Flutter 的 theme 抽出成共用 token，否則會越走越遠
- **遷移拖長成永久雙軌** → 每一步都要有可衡量的完成條件；若某一步遲遲不動，代價是長期維護兩套。建議每完成一步就重新評估是否繼續
- **Flutter 端仍在長新功能（D5），遷移目標持續變動** → 這是雙軌期的固有成本；壓縮遷移時程比凍結功能實際
- **Next.js 端的 Supabase 金鑰暴露面** → SSR 取資料時若使用 service role key 會是嚴重問題；分享頁必須沿用既有的 `get_shared_character` RPC ＋ anon key，該函式已是唯一授權點

## Migration Plan

1. 打 tag `native-final`，`git rm -r ios/ android/` 與相關設定，更新 CLAUDE.md
2. Flutter 改以 `--pwa-strategy=none` 建置並部署，確認現有功能不受影響
3. 建立 Next.js 應用骨架與合併部署腳本，暫不含任何路由，驗證 Flutter 仍由 catch-all 正常服務
4. 加入舊 SW 註銷程式碼，部署，驗證舊使用者不再被舊 SW 攔截
5. Dart 端切換 session 儲存格式（D4）
6. 分享頁 `/v/:token` 遷移至 Next.js，含 SSR 與 OG 卡片
7. 量測分享頁的首次可見內容時間，與遷移前的基準比對

回退：每一步皆可獨立回退。步驟 6 的回退只需移除 Next.js 的該路由，catch-all 會自動把流量交還 Flutter。

## Open Questions

- Next.js 的 Cloudflare 部署採靜態匯出、`@cloudflare/next-on-pages` 或 OpenNext？分享頁需要 SSR，靜態匯出不可行；三者對 Pages 的支援程度與部署複雜度需實測
- 設計 token（色票／字級／間距）如何自 Flutter theme 抽出並讓兩邊共用？手動同步在兩軌期會漂移
- 分享頁的 OG 圖是靜態品牌圖，還是動態產生含角色名與職業的卡片？後者體驗好得多，但需要邊緣端的圖片生成
- 既有分享連結的相容：`/v/:token` 路徑不變，但需確認舊 SW 註銷前開啟舊連結的行為
- 遷移完成後 Flutter 專案的處置——保留在同一 repo 還是移出？
