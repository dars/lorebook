# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

Lorebook — **web-only** 的 D&D 5.5e（2024 版規則）跑團角色卡，附帶世界觀筆記功能。
同一份 codebase 適配手機與桌機版型。

**實作在 `next/`。** 根目錄的 Flutter／Dart 實作（`lib/`、`test/` 與各平台目錄）
已刪除。需要知道「原本怎麼算」時，對照基準是 `golden/`（規則輸出的凍結快照，
含手改記錄）與 `docs/flutter-parity.md`（移植落差清單）；要看原始程式碼則翻 git
歷史（`git show <刪除前的 commit>:lib/...`）。

> `next/AGENTS.md` 由 `next dev` 自動寫入，內容是「這個版本的 Next 與你記憶中的
> 不同，動手前先讀 `node_modules/next/dist/docs/`」。那條建議是對的，Next 16 的
> App Router 有不少 API 與舊版不同。

### 內容範圍政策（content-scope）

- 一切規則內容以 **D&D 2024（5r）** 為基準
- 規則內容**僅**來自 **SRD 5.2（CC-BY-4.0）** 或使用者自訂資料；不收錄任何非 SRD 的官方出版內容
- **不涵蓋**怪物、官方劇本/劇情
- Product Identity 名稱（如 Bigby's、Tasha's）一律使用 SRD 官方改名（如 Arcane Hand）
- 玩家自產內容（角色卡、個人筆記）不受此限——排除的是官方出版內容，非使用者內容
- 內容庫匯入管線依上游 `srd52` 標記過濾，重匯不會回灌非 SRD 內容

## 常用指令

一律在 `next/` 底下執行。

```bash
npm install

# dev server（埠號固定 8087：Supabase Auth 的 Redirect URLs 登記了它）
# 必須先 source .dev.vars，見下方「環境變數」
set -a && . ./.dev.vars && set +a && npm run dev

npx tsc --noEmit     # 型別
npx eslint .         # 靜態分析
npx vitest run       # 全部測試
npx vitest run lib/rules/pips.test.ts   # 單一檔案
npm run build        # 正式建置
```

### 環境變數（很容易踩）

`next/` 有**兩份** env，內容不同、不可互換：

| 檔案 | 變數 | 誰在用 |
|---|---|---|
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client |
| `.dev.vars` | `SUPABASE_URL` / `SUPABASE_ANON_KEY`（**無前綴**） | middleware、server client |

`next dev` 只載入 `.env.local`，**不讀 `.dev.vars`**（那是 wrangler 的慣例檔）。
直接 `npm run dev` 會讓每個請求都回 500（`缺少環境變數 SUPABASE_URL`），而錯誤只
出現在 server log，瀏覽器看到的是空白錯誤頁——很容易誤判成程式壞掉。

### 部署

**一律手動走 wrangler，git push 不會部署。**

```bash
npm run build
npx wrangler deploy      # 目標是 Workers（OpenNext 產出 .open-next/worker.js）
```

Service worker 若出問題，停用方式是設環境變數 `SW_DISABLED=1` 後重新部署——
`/api/sw-status` 會回 `enabled:false`，頁面端與 SW 各自註銷並清快取。
**上線前務必演練過這條路**：已安裝在使用者瀏覽器裡的 SW 不會因為伺服器刪檔而消失，
沒有驗過停用路徑的 SW 等於不可回退的部署。

## 技術架構

- **Next.js 16**（App Router、React Server Components、Server Actions）
- **React 19** + TypeScript
- **Tailwind CSS v4**——設計 token 定義於 `next/app/globals.css` 的 `@theme`
- **zustand**：client 端的角色編輯狀態（`lib/state/character-store.ts`）
- **zod v4**：領域模型即 schema（`lib/domain/character.ts`）
- **Supabase**：Auth ＋ PostgreSQL，經 `@supabase/ssr` 走 cookie session
- **vitest**：測試（node 環境，只跑 `lib/**/*.test.ts`）
- **Cloudflare Workers**：經 `@opennextjs/cloudflare` ＋ wrangler

### 不要引入

- 新的 npm 相依除非確有必要——這個 codebase 一再選擇手寫小東西而非拉套件
  （service worker 手寫而不用 Serwist；不開 R2 增量快取）
- UI component library、CSS-in-JS：視覺語言是自有的
- 資料抓取函式庫（TanStack Query 等）：角色資料是「本機擁有的狀態」而非
  「伺服器快取」，用快取語意表達所有權語意兩邊都彆扭

### 資料夾結構

```
next/
  app/          # 路由、globals.css、manifest、api
  components/   # 以功能分組；components/ui 為共用基礎元件
  lib/          # 領域模型、規則計算、資料存取、state
```

## 資料架構

| 類別 | 表／view | 說明 |
|---|---|---|
| 靜態內容庫 | `v_spells`、`v_items`、`classes`、`subclasses`、`class_features` | SRD 5.2，公開資料，用匿名 client 讀；原始資料合計 < 1 MB |
| 角色卡 | `user_characters` | 整份存 `data jsonb`，另提升 `name`/`class_name`/`level` 供清單查詢；複合主鍵 `(user_id, id)`；`deleted_at` 軟刪 |
| 自創內容 | `user_backgrounds`、`user_subclasses` | |
| 分享 | `character_shares` | 檢視走 `get_shared_character` RPC（SECURITY DEFINER），檢視者不需登入 |

Campaign（多人共用筆記）**尚未實作**。

### Supabase 原則

- 所有表格需設 RLS；**動使用者資料表一律帶 user_id 條件**（`db query --linked` 會繞過 RLS）
- Server Component／Action 用 `lib/supabase/server.ts` 的 `createClient`；公開內容用 `createAnonClient`
- 同一請求內重複的查詢用 React `cache()` 去重——layout 與 page 常需要同一份資料，
  不去重就是多打好幾趟往返

## 編輯與同步模型

跑團當下扣 HP、消法術位是連續操作，每次往返伺服器要 0.3–1.5 秒才看到數字變化，
戰鬥中不能接受。所以：**Server Component 取資料、client store 編輯、debounce 3 秒
推回**（`lib/state/sync.ts`）。

`characterStore.load()` 在「同一張卡且有未推送變更」時**不覆蓋**本機狀態——切分頁
會讓元件卸載重掛並再 load 一次 initial，沒有這道保護會把剛才的編輯還原掉。

## 視覺語言

深色是這個 App 的識別：暗金色調、Cinzel 標題、區段標題的英中雙標＋延伸線、
卡片角落括號、盾牌造型的 AC 與屬性。這些不是「差不多就好」的裝飾。

- 色彩一律取 `globals.css` 的 token，不在元件裡寫死色碼
- **深色與淺色各有一套前景色**，兩套都要滿足 WCAG AA（內文 4.5:1）。
  新增或調整色值時在旁邊註明對比數值
- 中文走系統襯線堆疊（0 bytes）。**不要為中文引入 web font**——實測 11 個字就要 1.4 MB
- 觸控目標最小 44px；視覺尺寸不足時以偽元素擴大點擊區，不改排版
- 骰子表示法統一小寫 NdX（1d8、3×1d4+1）
- 金額一律「硬幣圖示＋數字」（`CoinAmount`），不用純文字幣別

> 舊規則「色票不得漂移／一切以 Flutter 為準」**已解除**（2026-08-12）。
> 那條規則造成淺色主題長期不敢動，gold 在羊皮紙底上只有 1.99:1。
> 現在以好看與可讀為準，Flutter 端不再回頭同步。

### 版型級距（對齊 Material 3 window size class）

依**可用寬度**而非裝置種類切換——同一台裝置縮放視窗就會跨級距。

- **compact**（< 600px）：單欄 ＋ 底部浮動書籤列
- **medium**（600–840px）：沿用單欄、內容置中限寬；導覽為側邊 Rail
- **expanded**（≥ 840px）：可多欄（行動頁三欄、角色頁左總覽右分頁）

拆分原則：優先同檔內以參數切換排列，資料與狀態保持一份；只有互動流程本身不同時
才分檔案。

## 角色卡核心資料模型（D&D 5.5e 2024）

- **基本資訊**：名稱、種族（Species）、背景（Background）、職業（Class）、等級、陣營
- **能力值**：STR / DEX / CON / INT / WIS / CHA（含修正值、豁免骰）
- **戰鬥數值**：AC（由裝備狀態推導，見 `lib/rules/ac.ts`）、HP（最大／當前／臨時）、
  速度、先攻、熟練加值
- **技能**：各技能熟練度標記與修正值
- **武器與攻擊**：由裝備中的武器（`Equipment` itemType=weapon 且 equipped）＋固定徒手攻擊推導
- **法術**：法術位、已備法術（按環數分類）
- **裝備與金幣**：`Equipment` 為二維分類（itemType × source）＋數量、任務旗標、
  成交價（`priceCp`）、武器／護甲機制欄位；購買扣款走分層扣款（`lib/rules/currency.ts`）
- **特性與專長**、**筆記欄位**

## 開發慣例

- 規則計算集中在 `lib/rules/`，**須有測試**
- Supabase 操作封裝在 `lib/<domain>/`，不在元件內直接呼叫
- 註解寫「**為什麼**」與踩過的坑，不寫「做了什麼」
- 語言：UI 與註解用繁體中文，程式碼與 identifier 用英文
- 同一個東西不要有兩份實作——這個 codebase 已經因此出過事
  （點格方向在兩份 `Pips` 裡都反了、法術卡好的那版只有行動頁在用）
