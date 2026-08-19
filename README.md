# Lorebook

**Web-only** 的 D&D 5.5e（2024 版規則）跑團角色卡，附帶世界觀筆記功能。
同一份 codebase 適配手機與桌機版型。

## 內容範圍

- 一切規則內容以 **D&D 2024（5r）** 為基準
- 規則內容**僅**來自 **SRD 5.2**（CC-BY-4.0）或使用者自訂資料，不收錄其他官方出版內容
- 不涵蓋怪物、官方劇本/劇情
- Product Identity 名稱一律採用 SRD 官方改名（如 Bigby's Hand → Arcane Hand／奧法之掌）

## 開發

實作在 `next/`（Next.js 16 + React 19 + TypeScript）。

```bash
cd next
npm install

# dev server（埠號固定 8087；.dev.vars 必須先載入，否則每頁 500）
set -a && . ./.dev.vars && set +a && npm run dev

npx tsc --noEmit && npx eslint . && npx vitest run
npm run build
```

部署一律手動走 wrangler，git push 不會部署：

```bash
cd next && npm run build && npx wrangler deploy
```

> 已退場的 Flutter 實作（根目錄 `lib/`、`test/` 與各平台目錄）已刪除。行為對照見
> `golden/`（規則輸出的凍結快照）與 `docs/flutter-parity.md`（移植落差清單）。

更多指令與架構說明見 [CLAUDE.md](CLAUDE.md)；內容資料庫說明見 [designs/SUPABASE.md](designs/SUPABASE.md)。
