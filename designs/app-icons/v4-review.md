# Lorebook icon v4 定稿檢查

檢查日期：2026-11-19。
結論：建議以 `lorebook-magic-book-v4-final.png` 作為定稿母圖。

## 最終調整

保留夜藍、象牙白與暖金配色。星芒改成短而均衡、略微傾斜的四角形，嵌入書頁上方；金色書籤移到右側，與星芒分開，移除第三版由星芒貫穿到書籤的長直線。

第一張 v4 圖在 32px 下星芒過小，因此進行一次針對星芒尺寸及輪廓的修正。最終採用 `v4-final`，不是初次輸出的 `v4`。

## 實際輸出與人工視覺檢查

| 檢查 | 結果 |
| --- | --- |
| 方形 32×32 | 可辨識打開的書與中央金色星光焦點；紙張紋理、四個尖角及書籤缺口會簡化，不作為此尺寸的辨識依據。 |
| 方形 64×64 | 書頁、星芒與右側書籤均可辨識；星芒與書籤之間沒有金色連線。 |
| 圓形 32×32、64×64 | 已實際套用透明圓形遮罩後縮圖；書角、星芒與書籤均完整保留，四周有餘裕。 |
| 十字架造型歧義 | 主觀視覺檢查：長直線已消除，傾斜短星芒與偏右的獨立書籤不再構成第三版的十字形。 |

`v4-checks/review.png` 上排展示原生像素，下排以最近鄰放大以檢視像素，未使用 AI 重繪縮圖。縮小使用 ImageMagick Lanczos；圓形遮罩先於縮圖套用。原始母圖為 1254×1254、完全不透明；僅圓形檢查輸出帶透明角落。

重現預覽：在專案根目錄執行 `sh designs/app-icons/build-v4-previews.sh`（需要 ImageMagick；預覽字體使用 macOS Arial）。

使用者已確認採用此版。正式 favicon、Apple icon 與 PWA 一般／maskable 圖示已由 `export-production.sh` 統一匯出；manifest 圖示網址帶母圖版本值。已部署並完成正式站 HTTP 與檔案雜湊驗證，未進行各平台實機驗證。

正式輸出驗證：

- favicon ICO 包含 16、32、48、64、256px 五個影格；Apple icon 為 180px；PWA 一般圖示為 192/512px；maskable 為 512px。PNG 皆不透明。
- 檢視 `v4-checks/production-review.png` 確認各平台圖示一致；`production-maskable-safe-area.png` 實際套用中央直徑 80% 圓形遮罩，書角、星芒及書籤完整保留。
- `npx eslint app/manifest.ts` 與 `npm run build` 通過（含 TypeScript 檢查）。
- 啟動本機正式版並檢查 `/manifest.webmanifest`、頁面 favicon／Apple link 及三個 PWA icon URL，全部回傳 HTTP 200，回應內容雜湊與匯出檔一致。PWA URL 帶版本值，Next.js 產生的 favicon／Apple URL 帶更新後的內容雜湊。

## 正式部署

- 日期：2026-11-19；Wrangler 身分：`devlin@code4soul.dev`；Worker：`lorebook`。
- 重新執行 OpenNext Cloudflare build，再執行 Wrangler deploy，確認實際上傳七個新增／修改資產。
- 建置版本：`18fa933-icon-927eacc30d79`。本次尚未提交 Git，明確指定獨立建置版本，避免沿用前次部署的 Git commit 版本及 SW 快取。
- Cloudflare Worker version：`9e26ecf5-4fa2-4faa-a64d-fd26e6ea2b86`。
- 正式站：`https://lorebook.party`；`/api/version` 已確認回傳上述建置版本。
- 線上 `/privacy` 與 `/login` 的 favicon／Apple／manifest link 已檢查。全部 PWA 圖示、favicon 與 Apple icon（含有版本參數及原始網址）皆回傳 HTTP 200，SHA-256 與本機正式匯出完全一致。
- 完整檔案雜湊及檢查時間：`v4-checks/production-verification.json`。重跑：`node designs/app-icons/verify-production.mjs`。

## 產出

- 母圖：`lorebook-magic-book-v4-final.png`
- 最後一次修正提示詞：`lorebook-magic-book-v4-final.prompt.txt`（內建 image_gen）
- 第一階段提示詞：`lorebook-magic-book-v4.prompt.txt`（內建 image_gen）
- 檢查圖：`v4-checks/review.png`
- 實際尺寸檔：`v4-checks/square-32.png`、`square-64.png`、`circle-32.png`、`circle-64.png`
