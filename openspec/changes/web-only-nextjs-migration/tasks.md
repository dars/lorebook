## 1. 了結原生（獨立可上線）

- [ ] 1.1 決定並處置 `ios/Runner.xcodeproj/project.pbxproj` 與 `ios/Podfile.lock` 目前未進版控的變動（連同本步驟一起了結，不留懸置）
- [ ] 1.2 打版控標籤 `native-final`，作為日後取回原生支援的起點
- [ ] 1.3 `git rm -r ios/ android/`
- [ ] 1.4 移除 `web/.well-known/apple-app-site-association` 與 `assetlinks.json`，以及 `web/_headers` 中對應的 Content-Type 規則
- [ ] 1.5 移除 `share_link.dart` 等處與 deep link／universal link 相關的敘述與設定
- [ ] 1.6 更新 CLAUDE.md：開頭的平台敘述、常用指令中的 iOS/Android 建置段落
- [ ] 1.7 更新 `openspec/project.md`（若含平台敘述）
- [ ] 1.8 `flutter analyze` 與 `flutter test` 全綠，`flutter build web` 通過
- [ ] 1.9 部署並確認線上功能不受影響

## 2. 關閉 service worker

- [ ] 2.1 Flutter web 改以 `--pwa-strategy=none` 建置，更新部署腳本與 CLAUDE.md 的指令
- [ ] 2.2 評估 `AppUpdateGate` 的處置——SW 關閉後其訊號源消失，決定停用或移除
- [ ] 2.3 部署，以無痕視窗確認新訪客不再註冊 SW
- [ ] 2.4 以既有 profile 確認舊 SW 仍在（此步驟尚未註銷，僅記錄現象作為 4.x 的對照）

## 3. Next.js 骨架與合併部署

- [ ] 3.1 決定 Cloudflare 部署方案（靜態匯出／`@cloudflare/next-on-pages`／OpenNext），以分享頁需要 SSR 為前提實測
- [ ] 3.2 建立 Next.js 應用骨架，暫不含任何業務路由
- [ ] 3.3 自 Flutter theme 抽出設計 token（色票、字級、間距），供兩邊共用
- [ ] 3.4 合併部署腳本：Flutter 產物置於 Next.js 靜態資產下，未匹配路徑 rewrite 至 Flutter index.html
- [ ] 3.5 部署，驗證所有既有路由仍由 Flutter 正常服務（catch-all 生效）
- [ ] 3.6 驗證直接輸入網址、重新整理、瀏覽器上下頁在 fallback 路徑下皆正常

## 4. 註銷舊 service worker

- [ ] 4.1 於 Next.js 根版面加入一次性註銷程式碼（`getRegistrations()` → `unregister()`），標註為遷移期暫時性程式碼
- [ ] 4.2 部署，以既有 profile 確認舊 SW 已被註銷且不再攔截請求
- [ ] 4.3 確認註銷後既有使用者的功能與資料不受影響

## 5. Session 共用

- [ ] 5.1 實作與 `@supabase/supabase-js` 相容的 `LocalStorage`（鍵 `sb-<project-ref>-auth-token`、JSON 形狀對齊）
- [ ] 5.2 `lib/main.dart` 的 `Supabase.initialize` 改用該實作
- [ ] 5.3 測試：session 寫入後可由 JS client 的格式解讀；登出後兩邊皆為未登入
- [ ] 5.4 部署，確認既有使用者被登出一次後可正常重新登入（此為已接受的一次性代價）
- [ ] 5.5 於登入頁加入本次變更的說明，避免使用者誤以為帳號異常

## 6. 分享頁遷移（第 1 步）

- [ ] 6.1 量測並記錄遷移前的基準：分享頁的傳輸量與首次可見內容時間
- [ ] 6.2 Next.js 端實作 `/v/:token`，以 anon key 呼叫既有的 `get_shared_character(p_token)` RPC（**不得使用 service role key**）
- [ ] 6.3 移植唯讀角色卡的呈現：行動與角色兩個情境，比照既有 `ReadOnlyScope` 下的內容範圍
- [ ] 6.4 移植失效分享的呈現與「顯示資料抓取時間 ＋ 手動重新整理」
- [ ] 6.5 字型策略：woff2 ＋ unicode-range 分片；使用者自產內容（角色名、筆記）需 fallback，不得出現豆腐字
- [ ] 6.6 Open Graph 中介資料；決定靜態品牌圖或動態卡片（見 design Open Questions）
- [ ] 6.7 確認分享頁仍不被搜尋引擎索引（既有「無公開索引」要求）
- [ ] 6.8 移除 Flutter 端的 `/v/:token` 路由，確認流量由 Next.js 承接
- [ ] 6.9 既有分享連結相容驗證：以遷移前發出的連結開啟

## 7. 驗收與量測

- [ ] 7.1 量測遷移後分享頁的傳輸量與首次可見內容時間，與 6.1 的基準比對並記錄
- [ ] 7.2 端到端驗證：建立分享 → 以無痕視窗開啟 → 撤銷 → 確認失效呈現
- [ ] 7.3 跨應用登入狀態驗證：於 Flutter 路由登入後開啟 Next.js 路由，不被要求重新登入
- [ ] 7.4 依實測結果決定是否繼續第 2 步（首頁／登入頁），並記錄判斷依據

## 8. 後續 change 的接續

- [ ] 8.1 更新 `offline-character-cache` 的 design：刪除原生儲存段落，改以 Next.js 為前提，並註明待編輯介面遷移後再實作
- [ ] 8.2 於 `custom-species`、`homebrew-share`、`dual-rules-version` 註記遷移期功能歸屬政策（續留 Flutter 端實作）
- [ ] 8.3 建立第 2 步（首頁／登入頁遷移）的 change 提案
