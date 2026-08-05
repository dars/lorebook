# Lorebook（Next.js 重寫）

取代 Flutter web 的新實作。進度與決策見
`openspec/changes/web-only-nextjs-migration`。

放在 `next/` 而非 `web/`——後者是 Flutter 的 web 資產目錄（`index.html`、
`manifest.json`、icons），Flutter 尚未刪除前不能佔用。重寫完成後（tasks 8.2）
本目錄內容提到根目錄。

## 指令

```bash
npm run dev                      # Next.js 開發伺服器
npx opennextjs-cloudflare build  # 產出 Cloudflare Worker
npx wrangler dev --port 8788     # 以 Workers runtime 在本機跑產出物
npx wrangler deploy              # 部署（Workers，不是 Pages）
```

`wrangler dev` 才是貼近正式環境的驗證方式——`npm run dev` 跑的是 Node，
不會暴露 Workers runtime 的限制。

## 環境變數

本機放 `.dev.vars`（不進版控），正式環境用 `wrangler secret put`：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

anon key 依設計即為公開值（現行 Flutter bundle 內也有），但仍不進版控。
**service role key 不得出現在此專案的任何位置。**
