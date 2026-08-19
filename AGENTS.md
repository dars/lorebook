# AGENTS.md

專案指引與 [CLAUDE.md](CLAUDE.md) **完全相同**，請直接讀那一份。

這裡不複製一份內容：兩份各自演化之後，改了其中一份而忘記另一份，比沒有這份檔案
更糟——下一個人會照著過期的那份做事。（這份檔案先前就發生過這件事：專案早已轉為
web-only 的 Next.js，它卻還寫著「支援 iOS / Android 的 Flutter App」。）

一句話版本：**實作在 `next/`**（Next.js 16 + React 19 + TypeScript + Supabase，
部署到 Cloudflare Workers）。已退場的 Flutter 實作（根目錄 `lib/`、`test/` 與各
平台目錄）已刪除，行為對照見 `golden/` 與 `docs/flutter-parity.md`。

dev server 必須先載入 `.dev.vars`，否則每個請求都回 500：

```bash
cd next && set -a && . ./.dev.vars && set +a && npm run dev
```
