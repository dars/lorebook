# 5etools 內容資料庫 — Supabase 架構說明

> 這份文件是給**其他專案的開發者 / AI agent** 快速理解本 Supabase 資料庫的結構與使用方式。
> 資料來源為 5etools 的**繁體中文化 fork**（D&D 5e 遊戲內容）。

---

## 1. 這是什麼

- 一個裝載 **D&D 5e 遊戲內容**（法術、物品、職業、種族、背景、專長、怪物等）的 Postgres 資料庫，託管於 Supabase。
- 內容以 **API 後端**為導向設計，供角色卡 / 建卡類應用查詢。
- 所有文字內容為**繁體中文（台灣正體）**，並保留對照的英文原名。

### 連線資訊

| 項目 | 值 |
|---|---|
| Project URL | `https://nmzvywrgefodpqdsqvsf.supabase.co` |
| Project Ref | `nmzvywrgefodpqdsqvsf` |
| REST endpoint | `{URL}/rest/v1/` |

- **前端讀取**：用 **anon / publishable key**。所有內容表已開 RLS 公開唯讀（`select` policy `using (true)`）。
- **寫入 / 匯入**：只有 **service_role key** 能寫（bypass RLS）。前端不應持有 service_role key。
- 資料庫為**唯讀內容庫**：沒有使用者資料、沒有寫入 API。若要存角色資料，另建 table 並自訂 RLS。

---

## 1.5 Quick Start（連線 + env）

安裝 client：

```bash
npm install @supabase/supabase-js
```

`.env`（前端可公開，這些是唯讀 publishable key；**不要**放 service_role key）：

```dotenv
SUPABASE_URL=https://nmzvywrgefodpqdsqvsf.supabase.co

# 推薦：現代 publishable key（可獨立輪換）
SUPABASE_PUBLISHABLE_KEY=sb_publishable_npAIISUFSzNEshoKNE6U2Q_EZ7jc9gG

# 或相容用的 legacy anon JWT（擇一即可）
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tenZ5d3JnZWZvZHBxZHNxdnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzc0NDAsImV4cCI6MjA5Nzg1MzQ0MH0.WAmWL8BO21k7qhfxLCzwNcvcjMS1u5U8kzmPgX-VbsM
```

建立 client 並測試：

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'   // 記得把 database.types.ts 一起複製過來

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,   // 或 SUPABASE_ANON_KEY
)

// 冒煙測試：抓 5 個 3 環法術
const { data, error } = await supabase
  .from('v_spells')
  .select('name, eng_name, level, school_name')
  .eq('level', 3)
  .limit(5)
console.log(error ?? data)
```

> **交接包 = 這份 `SUPABASE.md` + `database.types.ts` + 上面的 key。**
> 這些 key 只有唯讀權限（RLS `select`），放進前端 / repo 沒有安全疑慮；若要停用可在 Supabase Dashboard → Project Settings → API 輪換。

---

## 2. 設計哲學（重要，先讀）

採 **JSONB 混合模式**，每個實體一張表：

1. **提升欄位（promoted columns）**：常用來過濾 / 排序的欄位被拉成真正的 SQL 欄（如 `level`, `school`, `cr_number`, `rarity`），有索引。
2. **`data jsonb`**：保留**完整原始 5etools 物件**，不失真。渲染細節（`entries`、`range`、`components`…）都在這裡，前端照 5etools 的 renderer 吃 `data` 即可。

> 過濾 / 搜尋走提升欄位；顯示細節讀 `data`。

### 雙語慣例（**關鍵**）

- `name` = **繁體中文**名稱（顯示用）。
- `eng_name` = **英文原名**（**可能為 null**，並非每筆都有）。
- `source` = **英文書源代碼**（如 `PHB`, `TCE`, `XGE`, `EGW`），永遠是英文，適合當穩定 key。
- ⚠️ 職業關聯的名稱是**中英混雜**的（見第 5 節），跨表 join 職業時要小心。

### 文字內的標記

`data` 內的 `entries` 字串含 5etools 標記語法，例如：
- `{@dice 1d6}`、`{@damage 2d6}`、`{@spell 火球術}`、`{@item 長劍}`、`{@creature 哥布林}`、`{@condition 中毒}`
渲染時需自行解析這些標記（英文標記名 + 中文/英文參照）。標記在簡繁轉換中已被正確保留。

### 簡→繁轉換

原始資料為簡體，已用 **OpenCC `s2twp`**（含詞彙級轉換，如 `程序→程式`、`网络→網路`）全量轉為繁體。英文、代碼、`{@tag}` 標記不受影響。轉換邏輯在 `scripts/import_to_supabase.py` 的 `deep_convert()`。

---

## 3. 資料表總覽

| 表 | 筆數 | 說明 | 主要提升欄位 |
|---|---|---|---|
| `spells` | 573 | 法術 | `level, school, ritual, concentration, classes[], damage_inflict[], saving_throw[], condition_inflict[], area_tags[], misc_tags[]` |
| `monsters` | 2267 | 怪物（bestiary） | `size, type, cr, cr_number, ac_value, hp_average, str/dex/con/int/wis/cha, alignment[], environment[], *_tags[]` |
| `items` | 1484 | 物品（含魔法物品 / 基礎裝備 / 群組） | `type, rarity, req_attune, wondrous, weapon, armor, value_cp, weight, tier, property[], is_group, is_base` |
| `races` | 123 | 種族 | `size[]` |
| `backgrounds` | 99 | 背景 | — |
| `feats` | 166 | 專長 | `prerequisite (jsonb)` |
| `classes` | 26 | 職業 | `hd_faces, spellcasting_ability, caster_progression` |
| `subclasses` | 263 | 子職業 | `class_name, class_source, short_name, class_id → classes` |
| `class_features` | 2517 | 職業 / 子職業能力 | `class_name, class_source, level, is_subclass, class_id → classes` |
| `entries` | 1381 | **長尾通用表**（19 類，見下） | `kind` |
| `spell_classes` | 1533 | 法術↔職業關聯表 | `spell_id → spells, class_id → classes, class_name` |
| `sources` | 59 | 書源 metadata（不完整，見注意事項） | `kind, published` |

### 每張表的共同欄位

`id uuid (pk)`、`name text`、`eng_name text?`、`source text`、`page int?`、`data jsonb`（`spell_classes`、`sources` 除外）。多數表有 `UNIQUE(name, source)`。

### `entries` 表的 `kind` 類型

長尾內容統一收在 `entries`，用 `kind` 判別：

```
deity(463) optionalfeature(278) language(117) variantrule(117) reward(98)
psionic(52) vehicleUpgrade(31) cult(30) action(28) hazard(27) vehicle(24)
charoption(20) boon(20) trap(20) condition(15) disease(13) object(11)
table(11) languageScript(5) status(1)
```

查詢範例：`from('entries').select('*').eq('kind','optionalfeature')`

---

## 4. Views（API 便利視圖）

以**角色卡**為導向、`security_invoker=true`（尊重 RLS）、已授權 anon/authenticated。

| View | 說明 |
|---|---|
| `v_spells` | 攤平法術：`school_name`（英文全名）、`comp_v/comp_s/comp_m`、`casting_time/range/duration/entries`（jsonb 拆欄）+ 全部提升欄位 |
| `v_items` | 攤平物品：多一個 `value_gp`（= `value_cp/100`）+ `entries` |
| `v_optionalfeatures` | `entries` 中 `kind='optionalfeature'`（咒術祈喚 / 戰技 / 超魔法 / 戰鬥風格），拆出 `feature_type`, `prerequisite` |
| `v_search` | **統一搜尋索引**：`(kind, id, name, eng_name, source, page)`，跨 spells/items/races/backgrounds/feats/classes/subclasses + 玩家相關的 entries。**不含怪物與 DM 向內容** |

> 怪物**沒有** view（`v_monsters` 未建），但 `monsters` 表存在可直接查（野性化身 / 召喚 / 魔寵引用時用）。

---

## 5. 表間關聯（FK）

因名稱雙語（`classes.name` 為中文、能力 / 法術的職業參照多為英文），**不用字串複合 FK**，改用**語言無關的 `uuid` 代理鍵**：

| 關聯 | FK 欄 | 解析率 | 備註 |
|---|---|---|---|
| `subclasses → classes` | `subclasses.class_id` | 263/263 | `ON DELETE CASCADE` |
| `class_features → classes` | `class_features.class_id` | 2517/2517 | `ON DELETE SET NULL`；用中/英名 + 同名唯一 fallback 回填 |
| `spell_classes → spells` | `spell_classes.spell_id` | 1533/1533 | `ON DELETE CASCADE` |
| `spell_classes → classes` | `spell_classes.class_id` | 1533/1533 | `ON DELETE SET NULL` |

有了真正的 FK，**PostgREST 支援巢狀嵌入查詢**（見下）。

> `class_name` / `class_source` 等字串欄仍保留（可能是英文名），但**跨表 join 職業請用 `class_id`**，別用字串。

---

## 6. 查詢範例（supabase-js）

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'   // 見第 8 節

const supabase = createClient<Database>(URL, ANON_KEY)

// 3 環、法師可用的法術
await supabase.from('v_spells').select('name, eng_name, level, school_name')
  .eq('level', 3).contains('classes', ['Wizard'])

// 統一搜尋（中文或英文）
await supabase.from('v_search').select('*').ilike('name', '%火球%')

// 職業帶子職業與能力（FK 嵌入）
await supabase.from('classes')
  .select('name, eng_name, subclasses(name, short_name), class_features(name, level)')
  .eq('eng_name', 'Wizard')

// 某職業的完整法術清單（經關聯表）
await supabase.from('spell_classes')
  .select('classes!inner(eng_name), spells(name, level, school)')
  .eq('classes.eng_name', 'Wizard')

// 稀有度過濾 + gp 價格
await supabase.from('v_items').select('name, rarity, value_gp')
  .eq('rarity', 'rare').order('value_gp')
```

### 直接查 `data`（渲染細節）
```ts
const { data } = await supabase.from('spells').select('name, data').eq('eng_name','Fireball').single()
// data.entries / data.range / data.components / data.scalingLevelDice ...
```

---

## 7. 欄位編碼對照

- **法術學派 `school`**（單字元）：`A`=Abjuration `C`=Conjuration `D`=Divination `E`=Enchantment `V`=Evocation `I`=Illusion `N`=Necromancy `T`=Transmutation。（`v_spells.school_name` 已提供英文全名。）
- **`cr` / `cr_number`**：`cr` 是字串（含 `"1/8"`, `"1/4"`, `"1/2"`），`cr_number` 是數值（`0.125`, `0.25`, `0.5`, `1`…）方便範圍過濾。
- **`ac_value` / `hp_average`**：從結構化的 `data.ac` / `data.hp` 抽出的代表數值；完整結構仍在 `data`。
- **`value_cp`**：物品價值以**銅幣**為單位（1 gp = 100 cp）。`v_items.value_gp` 已換算。
- **`size`**：`T/S/M/L/H/G`（Tiny→Gargantuan）。

---

## 8. TypeScript 型別

`scripts/database.types.ts` 為 `supabase gen types` 產物，含所有表、view 與 FK Relationships。用 `createClient<Database>(...)` 即可獲得完整型別推導（含嵌入查詢）。

schema 若變更，重新產生：
```
# 透過 Supabase MCP 或 CLI
supabase gen types typescript --project-id nmzvywrgefodpqdsqvsf > scripts/database.types.ts
```

---

## 9. 匯入 / 重建流程（維運）

| 檔案 | 用途 |
|---|---|
| `supabase/migrations/0001_core_schema.sql` | 建表 + 索引 |
| `supabase/migrations/0002_api_views.sql` | 建 views |
| `supabase/migrations/0003_relationships.sql` | 加 FK / `spell_classes` 表 |
| `scripts/import_to_supabase.py` | 讀 `data/*.json` → 正規化 + s2twp 轉換 → REST 批次 upsert |

匯入（需 OpenCC，於 venv）：
```bash
# .env 需含 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY（勿 commit）
set -a; source .env; set +a
.venv/bin/python scripts/import_to_supabase.py            # 全部
.venv/bin/python scripts/import_to_supabase.py spells     # 指定實體
CONVERT_S2TWP=0 .venv/bin/python scripts/import_to_supabase.py   # 關閉簡繁轉換
```
- 匯入為**冪等**（`UNIQUE(name, source)` upsert）。但**若重跑轉換後 name 會變**，等於新資料——需要時先 `TRUNCATE` 再重灌，並重跑 `0003` 的回填 UPDATE。
- `class_features` 無唯一鍵，採「清空後重插」。

---

## 10. 注意事項 / 已知限制

1. **`sources` 表不完整**：內容用到 110 個 source 代碼，`sources` 只收錄 59 個（books/adventures.json），故**未建 `source` 外鍵**。把 `source` 當字串 join `sources` 時，約半數會找不到書名。
2. **`spell_classes` 只含 `fromClassList`**（標準職業法術表），**不含** `fromClassListVariant`（子職業額外授予的法術）——後者仍在 `spells.data.classes`。
3. **`eng_name` 可為 null**（例如部分怪物、專長）。做英文搜尋 / join 時要容錯。
4. **怪物無 view**，且怪物內容對建卡多為輔助（召喚 / 變身引用）。
5. **中英名混用**：跨表關聯職業一律用 `class_id`（uuid），勿用 `class_name` 字串。
6. **PostgreSQL 陷阱**：用 `~ '[简繁字集]'`（bracket 字元集）比對 CJK 會誤判（位元組範圍），改用交替式 `~ '术|伤|级'`。
7. 內容為**唯讀**；此庫不含使用者 / 角色資料。

---

## 11. 一句話總結給接手的 agent

> 這是一個 **JSONB 混合、繁體中文、唯讀** 的 D&D 5e 內容庫。**過濾用提升欄位、顯示讀 `data`；顯示用 `name`（中）、穩定 key 用 `source`+`eng_name`；跨表關職業用 `class_id`；優先用 `v_*` views 和 `v_search`。**
