## Why

推廣策略已確定為 **web-only**，不再發行 iOS/Android 原生 app。這個決定移除了 Flutter 的核心正當性——「一份 codebase 三平台」——之後 Flutter web 就只能在 web 的戰場上，以純粹的 web 體質競爭，而它在那裡有結構性劣勢。

實測線上首次載入（brotli 壓縮後的真實傳輸量）：

| 資產 | 傳輸量 |
|---|---|
| NotoSerifTC-Variable.ttf | 4.09 MB |
| canvaskit.wasm | 2.69 MB |
| main.dart.js | 1.04 MB |
| **合計** | **≈ 7.8 MB** |

以 4G 約 10 Mbps 估算，下載約 6 秒，加上 CanvasKit 初始化與 Dart 啟動，**首次可見內容約 8–10 秒**。

關鍵在於這是**天花板而非調校問題**：CanvasKit 的 2.69 MB 拿不掉（HTML renderer 已於新版 Flutter 移除），字型即使 subset 到極致也大約停在 5.2 MB。同樣一張角色卡在 Next.js 上約 200–250 KB 的 JS 加分片字型，且 SSR 的第一個回應就是可讀 HTML，**約 1–2 秒可見內容**。

web-only 之後，**每一位新使用者的第一印象都是那 8–10 秒**，而且沒有 App Store 曝光，自然搜尋成為主要的被動流量來源——但 Flutter SPA 現在的 SEO 收錄近乎為零。這兩件事同時打在獲客漏斗的入口。

放棄原生的功能代價則接近零：相依掃描顯示本 App 幾乎不用任何原生專屬能力（`image_picker` 有 File API、`share_plus` 有 Web Share API、其餘皆為 web 支援），無推播、無背景任務、無生物辨識、無本地通知。

## What Changes

- **確立 web-only**：移除 iOS/Android 建置目標與其設定資產（**BREAKING**：不再產出原生 app；deep link／universal link 隨之退場）
- 建立**絞殺者（strangler fig）遷移架構**：Next.js 與 Flutter 共存於同一網域，逐路由搬遷，未搬遷的路由 fallback 至 Flutter
- 兩個建置產物合併為單一部署
- Supabase session 跨兩個 client 共用，使用者不因路由屬於哪一邊而被要求重複登入
- 處理 Flutter service worker 的作用域——它註冊於 `/`，會攔截已遷移的路由並回舊資產
- **遷移第 1 步：分享頁 `/v/:token`** 改由 Next.js 以 SSR 提供，附社群預覽卡片
- 遷移期間的新功能歸屬政策成文，避免同一功能兩邊各寫一次

## Capabilities

### New Capabilities
- `web-delivery`: 網站的交付形態——平台範圍、兩個 app 的路由分工與部署合併、session 共用、service worker 作用域、遷移期間的功能歸屬政策

### Modified Capabilities
- `routing`: 分享檢視路由不再需要支援 deep link（universal link / app link）；該路由改由 Next.js 承接
- `character-share`: 分享頁新增社群預覽卡片與「首次開啟不需下載完整 app」的交付要求

## Impact

**移除**
- `ios/`、`android/` 目錄與其設定（處置方式見 design D1）
- iOS entitlements 的 Associated Domains、`web/.well-known/` 的 apple-app-site-association 與 assetlinks.json
- 目前未進版控的 `ios/Runner.xcodeproj/project.pbxproj` 與 `ios/Podfile.lock` 變動——連同本 change 一併了結

**新增**
- Next.js 應用（首版只含分享頁）
- 合併部署腳本，取代現行的單一 `wrangler pages deploy build/web`

**修改**
- `lib/main.dart`：Supabase 初始化改用與 JS client 相容的 session 儲存
- Flutter web 建置參數（service worker 策略）
- `CLAUDE.md`：開頭的「支援 iOS / Android 的 Flutter App」與常用指令中的原生建置段落
- `openspec/project.md`（若含平台敘述）

**相依變更**
- `offline-character-cache`（已提案未實作）：其原生儲存那半（`path_provider`）失去意義；且若編輯介面終將搬到 Next.js，在 Flutter 端實作等於寫了就丟。本 change 的 design 給出處置建議
- `custom-species`、`homebrew-share`、`dual-rules-version` 均為 Flutter 端待實作 change，受遷移期功能歸屬政策約束

**不影響**
- 後端：無 schema 或 RLS 變更。`get_shared_character(p_token)` RPC 原樣供 Next.js 呼叫
- SRD 內容範圍政策（content-scope）

## Non-Goals

- 本 change 不實作遷移第 2–4 步（首頁／登入頁、角色卡唯讀檢視、編輯與戰鬥介面），各自另開 change
- 不重寫規則邏輯（`derived_stats`、`currency_math`、`level_up`、職業資源推導）——那些留在 Flutter 端，直到其所屬路由被遷移
- 不改變視覺設計語言
