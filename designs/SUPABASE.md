# 5etools 內容資料庫 — Supabase 架構說明

> 這份文件是給**其他專案的開發者 / AI agent** 快速理解本 Supabase 資料庫的結構與使用方式。
> 資料來源為 5etools 的**繁體中文化 fork**,內容範圍為 **D&D 2024(5r)之 SRD 5.2**。

---

## 1. 這是什麼

- 一個裝載 **D&D 2024(5r)遊戲規則內容**(法術、職業、種族、背景、專長、狀態等)的 Postgres 資料庫,託管於 Supabase。
- **內容範圍政策(content-scope)**:僅收錄 **SRD 5.2(CC-BY-4.0)** 涵蓋的內容——單一書源 `XPHB`,且每列 `srd = true`。不含怪物、官方劇本/劇情,不含任何非 SRD 官方出版內容。Product Identity 名稱一律採 SRD 官方改名(如 Bigby's Hand → Arcane Hand/奧法之掌)。
- 內容以 **API 後端**為導向設計,供角色卡 / 建卡類應用查詢。
- 所有文字內容為**繁體中文(台灣正體)**,並保留對照的英文原名。

### 連線資訊

| 項目 | 值 |
|---|---|
| Project URL | `https://nmzvywrgefodpqdsqvsf.supabase.co` |
| Project Ref | `nmzvywrgefodpqdsqvsf` |
| REST endpoint | `{URL}/rest/v1/` |

- **前端讀取**:用 **anon / publishable key**。所有內容表已開 RLS 公開唯讀(`select` policy `using (true)`)。
- **寫入 / 匯入**:只有 **service_role key** 能寫(bypass RLS)。前端不應持有 service_role key。
- 資料庫為**唯讀內容庫**:沒有使用者資料、沒有寫入 API。若要存角色資料,另建 table 並自訂 RLS。

### 授權(Attribution)

> This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

繁體中文翻譯為衍生創作,同樣依 CC-BY-4.0 授權。

---

## 1.5 Quick Start(連線 + env)

安裝 client:

```bash
npm install @supabase/supabase-js
```

`.env`(前端可公開,這些是唯讀 publishable key;**不要**放 service_role key):

```dotenv
SUPABASE_URL=https://nmzvywrgefodpqdsqvsf.supabase.co

# 推薦:現代 publishable key(可獨立輪換)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_npAIISUFSzNEshoKNE6U2Q_EZ7jc9gG

# 或相容用的 legacy anon JWT(擇一即可)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tenZ5d3JnZWZvZHBxZHNxdnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNzc0NDAsImV4cCI6MjA5Nzg1MzQ0MH0.WAmWL8BO21k7qhfxLCzwNcvcjMS1u5U8kzmPgX-VbsM
```

建立 client 並測試:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'   // 記得把 database.types.ts 一起複製過來

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,   // 或 SUPABASE_ANON_KEY
)

// 冒煙測試:抓 5 個 3 環法術
const { data, error } = await supabase
  .from('v_spells')
  .select('name, eng_name, level, school_name')
  .eq('level', 3)
  .limit(5)
console.log(error ?? data)
```

> **交接包 = 這份 `SUPABASE.md` + `database.types.ts` + 上面的 key。**
> 這些 key 只有唯讀權限(RLS `select`),放進前端 / repo 沒有安全疑慮;若要停用可在 Supabase Dashboard → Project Settings → API 輪換。

---

## 2. 設計哲學(重要,先讀)

採 **JSONB 混合模式**,每個實體一張表:

1. **提升欄位(promoted columns)**:常用來過濾 / 排序的欄位被拉成真正的 SQL 欄(如 `level`, `school`, `rarity`),有索引。
2. **`data jsonb`**:保留**完整原始 5etools 物件**,不失真。渲染細節(`entries`、`range`、`components`…)都在這裡,前端照 5etools 的 renderer 吃 `data` 即可。

> 過濾 / 搜尋走提升欄位;顯示細節讀 `data`。

### 雙語慣例(**關鍵**)

- `name` = **繁體中文**名稱(顯示用)。
- `eng_name` = **英文原名**(**可能為 null**,並非每筆都有)。
- `source` = **英文書源代碼**;現況**只有 `XPHB`**(2024 修訂版)一種,且所有列 `srd = true`。
- ⚠️ 職業關聯的名稱是**中英混雜**的(見第 5 節),跨表 join 職業時要小心。

### 文字內的標記

`data` 內的 `entries` 字串含 5etools 標記語法,例如:
- `{@dice 1d6}`、`{@damage 2d6}`、`{@spell Fireball|XPHB|火球術}`、`{@condition Poisoned|XPHB|中毒}`
渲染時需自行解析這些標記(英文標記名 + 中文/英文參照)。標記在簡繁轉換中已被正確保留。內容庫內所有交叉引用的目標均存在且為 SRD 名稱(已全庫掃描驗證)。

### 簡→繁轉換

原始資料為簡體,已用 **OpenCC `s2twp`**(含詞彙級轉換,如 `程序→程式`、`网络→網路`)全量轉為繁體。英文、代碼、`{@tag}` 標記不受影響。轉換邏輯在 `scripts/import_to_supabase.py` 的 `deep_convert()`。

---

## 3. 資料表總覽

| 表 | 筆數 | 說明 | 主要提升欄位 |
|---|---|---|---|
| `spells` | 339 | 法術(SRD 5.2 全集) | `level, school, ritual, concentration, classes[], damage_inflict[], saving_throw[], condition_inflict[], area_tags[], misc_tags[]` |
| `classes` | 12 | 職業(全 12 職) | `hd_faces, spellcasting_ability, caster_progression` |
| `subclasses` | 12 | 子職業(**每職業 1 個**) | `class_name, class_source, short_name, class_id → classes` |
| `class_features` | 353 | 職業 / 子職業能力 | `class_name, class_source, level, is_subclass, class_id → classes` |
| `races` | 9 | 種族(無 Aasimar) | `size[]` |
| `backgrounds` | 4 | 背景(侍僧/罪犯/賢者/士兵) | — |
| `feats` | 17 | 專長(含起源專長) | `prerequisite (jsonb)` |
| `entries` | 44 | **長尾通用表**(見下) | `kind` |
| `items` | 0 | 物品(**保留表結構**,SRD 裝備目錄未匯入) | `type, rarity, …` |
| `sources` | 59 | 書源 metadata(僅供書目對照) | `kind, published` |

### 每張表的共同欄位

`id uuid (pk)`、`name text`、`eng_name text?`、`source text`、`page int?`、`srd bool`、`data jsonb`(`sources` 除外;`subclasses`/`class_features` 無 `srd` 欄)。多數表有 `UNIQUE(name, source)`。

### `entries` 表的 `kind` 類型

```
optionalfeature(29) condition(15)
```

- `optionalfeature`:SRD 涵蓋的戰技/超魔法/魔能祈喚等職業選項。
- `condition`:15 種異常狀態(含 2024 版力竭)。

查詢範例:`from('entries').select('*').eq('kind','condition')`

---

## 4. Views(API 便利視圖)

以**角色卡**為導向、`security_invoker=true`(尊重 RLS)、已授權 anon/authenticated。

| View | 說明 |
|---|---|
| `v_spells` | 攤平法術:`school_name`(英文全名)、`comp_v/comp_s/comp_m`、`casting_time/range/duration/entries`(jsonb 拆欄)+ 全部提升欄位 |
| `v_items` | 攤平物品:多一個 `value_gp`(= `value_cp/100`)+ `entries`(目前空,表保留) |

> `monsters`、`spell_classes` 表與 `v_search`、`v_optionalfeatures` view 已於 rules-core-2024-5r 移除;非 SRD 內容已於 srd-content-baseline 全數清除。

---

## 5. 表間關聯(FK)

因名稱雙語(`classes.name` 為中文、能力 / 法術的職業參照多為英文),**不用字串複合 FK**,改用**語言無關的 `uuid` 代理鍵**:

| 關聯 | FK 欄 | 解析率 | 備註 |
|---|---|---|---|
| `subclasses → classes` | `subclasses.class_id` | 12/12 | `ON DELETE CASCADE` |
| `class_features → classes` | `class_features.class_id` | 353/353 | `ON DELETE SET NULL`;匯入後需回填(見第 9 節) |

法術↔職業關聯用 `spells.classes[]`(text[],英文職業名),如 `.contains('classes', ['Wizard'])`。

> `class_name` / `class_source` 等字串欄仍保留(可能是英文名),但**跨表 join 職業請用 `class_id`**,別用字串。

---

## 6. 查詢範例(supabase-js)

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'   // 見第 8 節

const supabase = createClient<Database>(URL, ANON_KEY)

// 3 環、法師可用的法術
await supabase.from('v_spells').select('name, eng_name, level, school_name')
  .eq('level', 3).contains('classes', ['Wizard'])

// 職業帶子職業與能力(FK 嵌入)
await supabase.from('classes')
  .select('name, eng_name, subclasses(name, short_name), class_features(name, level)')
  .eq('eng_name', 'Wizard')

// 異常狀態全文
await supabase.from('entries').select('name, eng_name, data').eq('kind', 'condition')
```

### 直接查 `data`(渲染細節)
```ts
const { data } = await supabase.from('spells').select('name, data').eq('eng_name','Fireball').single()
// data.entries / data.range / data.components / data.scalingLevelDice ...
```

---

## 7. 欄位編碼對照

- **法術學派 `school`**(單字元):`A`=Abjuration `C`=Conjuration `D`=Divination `E`=Enchantment `V`=Evocation `I`=Illusion `N`=Necromancy `T`=Transmutation。(`v_spells.school_name` 已提供英文全名。)
- **`value_cp`**:物品價值以**銅幣**為單位(1 gp = 100 cp)。`v_items.value_gp` 已換算。
- **`size`**:`T/S/M/L/H/G`(Tiny→Gargantuan)。

---

## 8. TypeScript 型別

`scripts/database.types.ts` 為 `supabase gen types` 產物,含所有表、view 與 FK Relationships。用 `createClient<Database>(...)` 即可獲得完整型別推導(含嵌入查詢)。

schema 若變更,重新產生:
```
# 透過 Supabase MCP 或 CLI
supabase gen types typescript --project-id nmzvywrgefodpqdsqvsf > scripts/database.types.ts
```

---

## 9. 匯入 / 重建流程(維運)

| 檔案 | 用途 |
|---|---|
| `supabase/migrations/0001_core_schema.sql` | 建表 + 索引 |
| `supabase/migrations/0002_api_views.sql` | 建 views |
| `supabase/migrations/0003_relationships.sql` | 加 FK |
| `scripts/import_to_supabase.py` | 讀 `data/*.json` → **SRD 過濾**(`srd52`)+ 正規化 + s2twp 轉換 → REST 批次 upsert |
| `scripts/srd_realign.py` | SRD 收斂一條龍:刪非 SRD 列 → 重匯 → FK 回填 → 驗證 |

**SRD 過濾規則**:匯入工具依上游 `srd52` 標記過濾——無標記的條目**不匯入**、有標記者 `srd = true`。任何重匯都不會把非 SRD 內容寫回。

匯入(需 OpenCC,於 venv):
```bash
# .env 需含 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY(勿 commit)
set -a; source .env; set +a
.venv/bin/python scripts/import_to_supabase.py            # 全部
.venv/bin/python scripts/import_to_supabase.py spells     # 指定實體
```
- 匯入為**冪等**(`UNIQUE(name, source)` upsert)。但**若重跑轉換後 name 會變**,等於新資料——需要時先清空再重灌。
- `class_features` 無唯一鍵,採「清空後重插」;匯入後**必須回填 `class_id`**(`scripts/backfill_class_ids.sql` 或 `srd_realign.py` 的 step 4)。

---

## 10. 注意事項 / 已知限制

1. **`sources` 表僅供書目對照**,未建 `source` 外鍵;內容列的 `source` 現況只有 `XPHB`。
2. **`eng_name` 可為 null**,做英文搜尋 / join 時要容錯。
3. **中英名混用**:跨表關聯職業一律用 `class_id`(uuid),勿用 `class_name` 字串。
4. **PostgreSQL 陷阱**:用 `~ '[简繁字集]'`(bracket 字元集)比對 CJK 會誤判(位元組範圍),改用交替式 `~ '术|伤|级'`。
5. 內容為**唯讀**;此庫不含使用者 / 角色資料。
6. **items 表為空**:等 SRD 裝備目錄批次匯入(App 目前無物品目錄查詢路徑)。

---

## 11. 一句話總結給接手的 agent

> 這是一個 **JSONB 混合、繁體中文、唯讀、僅 SRD 5.2(CC-BY-4.0)** 的 D&D 2024 內容庫。**過濾用提升欄位、顯示讀 `data`;顯示用 `name`(中)、穩定 key 用 `source`+`eng_name`;跨表關職業用 `class_id`;法術查 `v_spells`。**
