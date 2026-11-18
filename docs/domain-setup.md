# 正式網域

- 正式入口：`https://lorebook.party`
- `www.lorebook.party` 與 `lorebook.code4soul.dev` 保留綁定，頁面以 308 轉向正式入口，保留路徑與查詢參數。
- Cloudflare Worker：`lorebook`，帳號 `devlin@code4soul.dev`。DNS 與憑證由 `next/wrangler.jsonc` 的 Custom Domains 管理。
- `workers.dev` 保留作部署備援；localhost 不轉址。

## 登入

Supabase 專案不變（`nmzvywrgefodpqdsqvsf`），角色與收藏資料不搬移。
Auth Site URL 使用 `https://lorebook.party`，Redirect URLs 加入
`https://lorebook.party/auth/callback**`，涵蓋 callback 的 `next` 查詢參數。
既有 localhost 與舊網域的白名單保留，讓進行中的登入仍能完成。
Google provider 的 callback 仍是 Supabase 的 `/auth/v1/callback`，不是網站的 callback。

### Google 品牌與所有權（2026-11-18 完成）

- Google Cloud 專案：`lorebook-503208`，管理帳號 `devlin@code4soul.dev`。
- Google Auth Platform 品牌首頁、隱私權與條款分別為正式網域根路徑、`/privacy`、`/terms`。
- 授權網域包含 `lorebook.party`，保留 `code4soul.dev` 與既有 Supabase callback 網域。
- Search Console 已透過根網域 DNS TXT 驗證所有權；Cloudflare 的 `google-site-verification` 記錄需保留。
- Google 品牌重新驗證通過，已按「發布品牌宣傳內容」，狀態為「品牌已完成驗證，並向使用者顯示」。
- 已實測 Google 登入成功回到 `https://lorebook.party/character-select`，既有角色清單正常顯示。

Cookie、主題偏好與離線快取依網域隔離：新網域需要重新登入；已安裝的舊 PWA 可改由新網域重新加入主畫面。
POST、API、OAuth callback 與靜態資產不轉址，避免舊頁面存檔和 PKCE 流程中斷。

## 部署驗證

先完成 Supabase 白名單，再依 CLAUDE.md 建置、部署。
檢查 apex HTTPS、www/舊域名的路徑轉址、Google 登入回跳、`/api/version` 與靜態 chunk 雜湊。
舊分享 `/v/...` 和自創分享 `/h/...` 會保留識別碼轉址，新分享連結自動採用目前 origin。
