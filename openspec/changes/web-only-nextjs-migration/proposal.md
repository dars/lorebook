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
- **以 Next.js 全面重寫（clean-slate），不採絞殺者共存**：目前僅 11 個帳號、21 筆角色，皆為本人與朋友的測試資料，可接受一次性切換與重新登入。共存機制（catch-all 路由、雙產物部署、session 跨 client 相容）的唯一作用是避免中斷，不值得為此規模支付
- Flutter 停止部署但留在 repo 作為重寫期間的行為對照，追平後再刪
- Flutter 端功能凍結：待實作的 change 一律不在即將退場的程式碼上開發
- **既有測試資料於切換時清除**（測試人員已知會）；因此不移植回填鏈——實測 21 筆中 0 筆含舊版武器清單，`migrateLegacyWeapons` 對現存資料完全不觸發。重寫期間資料保留作為真實解析素材，切換時清空並以產生器重灌 demo 角色
- 主動註銷舊 service worker——它註冊於 `/`，會攔截新站並回舊資產
- 分享頁 `/v/:token` 改為 SSR 並附社群預覽卡片

## Capabilities

### New Capabilities
- `web-delivery`: 網站的交付形態——平台範圍、單一應用交付、切換期的 service worker 註銷、重寫期間的功能凍結、規則邏輯的移植驗收方式

### Modified Capabilities
- `routing`: 分享檢視路由不再需要支援 deep link（universal link / app link）；該路由改由 Next.js 承接
- `character-share`: 分享頁新增社群預覽卡片與「首次開啟不需下載完整 app」的交付要求

## Impact

**移除**
- `ios/`、`android/` 目錄與其設定（處置方式見 design D1）
- iOS entitlements 的 Associated Domains、`web/.well-known/` 的 apple-app-site-association 與 assetlinks.json
- 目前未進版控的 `ios/Runner.xcodeproj/project.pbxproj` 與 `ios/Podfile.lock` 變動——連同本 change 一併了結

**新增**
- Next.js 應用（全功能，取代現行 Flutter web）
- 部署管線改以 Next.js 產物為目標，取代現行的 `wrangler pages deploy build/web`

**修改**
- `CLAUDE.md`：平台敘述與常用指令
- `openspec/project.md`（若含平台敘述）

**停止維護**
- Flutter 專案（`lib/`、`test/`）於重寫期間凍結，追平後刪除

**相依變更**
- `custom-species`、`homebrew-share`、`dual-rules-version`、`offline-character-cache` 一律凍結，不在即將退場的 Flutter 端實作；proposal 與 design 保留，重寫完成後以 Next.js 為前提接續

**不影響**
- 後端：無 schema 或 RLS 變更。`get_shared_character(p_token)` RPC 原樣供 Next.js 呼叫
- SRD 內容範圍政策（content-scope）

## Non-Goals

- 保持服務不中斷——明確接受一次性切換與重新登入
- 產品功能擴充：重寫期間不加新功能，擱置的 change 待完成後接續
- 不改變視覺設計語言
