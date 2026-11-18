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

Cookie、主題偏好與離線快取依網域隔離：新網域需要重新登入；已安裝的舊 PWA 可改由新網域重新加入主畫面。
POST、API、OAuth callback 與靜態資產不轉址，避免舊頁面存檔和 PKCE 流程中斷。

## 部署驗證

先完成 Supabase 白名單，再依 CLAUDE.md 建置、部署。
檢查 apex HTTPS、www/舊域名的路徑轉址、Google 登入回跳、`/api/version` 與靜態 chunk 雜湊。
舊分享 `/v/...` 和自創分享 `/h/...` 會保留識別碼轉址，新分享連結自動採用目前 origin。
