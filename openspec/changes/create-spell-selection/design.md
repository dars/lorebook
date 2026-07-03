# Design: create-spell-selection

## Context

建角流程（`character_create_page.dart`）目前為固定 6 步（基本 / 職業 / 背景 / 能力值 / 技能 / 確認），資料來自 `character_creation_data.dart` 的本機常數（`kClasses` 等）。內容庫側已具備：

- `CatalogRepository.fetchSpells({level, className})` 查 `v_spells`（固定 `source=PHB` 過濾），及 `spellCatalogProvider`（family，key 為 `({int? level, String? className})` record）
- `FtEntriesView` / `ftTokenize`：5etools 標記渲染與純解析層
- 內容庫離線（未登入/無網路）時 provider 為 error 狀態的既有降級慣例（conditions 對話框已採用）

限制：內容庫為 2014 版資料（既定決策：先不管 2024 落差）；`v_spells.classes` 為英文職業名陣列；`Character.Spell` 的 `description` 為純文字 String。

## Goals / Non-Goals

**Goals:**
- 施法職業建角時能選滿規則要求的戲法與一環法術，建出即可玩的角色卡
- 法術清單與描述來自內容庫，選擇當下反正規化寫入 `Character`（角色卡自持有，之後離線可讀）
- 非施法職業流程零感知（仍為 6 步）
- 內容庫不可用時建角流程仍可完成

**Non-Goals:**
- 升級（level up）時的法術學習/替換
- 建角後於法術頁補選/編輯法術（另案）
- 裝備/武器選擇步驟（另案）
- 法術搜尋、學派過濾等進階選擇器功能（清單依職業+環數已夠短）
- 2024（XPHB）資料源引入

## Decisions

### D1. 步驟清單改為依職業動態產生
`_steps` 由固定常數改為 getter：施法職業回傳 7 步（…技能 / **法術** / 確認），非施法職業維持 6 步。步驟指示器顯示的總數與當前序號跟著變。
**捨棄方案**：固定 7 步 + 非施法職業自動跳過——指示器會顯示幽靈步驟，且「跳過」的邊界（返回鍵行為）易出 bug。

### D2. 施法機制常數寫入 `kClasses`（2024 數值）
`ClassOption` 新增三個 int 欄位：`cantripsKnown`（戲法已知數）、`preparedSpells`（一環準備數）、`level1Slots`（1 級法術位數）。非施法職業全為 0（並以 `spellAbility.isEmpty` 判斷是否施法，沿用現況）。數值採 2024 PHB（吟遊詩人 2/4/2、牧師 3/4/2、德魯伊 2/4/2、聖騎士 0/2/2、遊俠 0/2/2、術士 4/2/2、邪術師 2/2/1、法師 3/4/2；實作時逐一覆核）。
**理由**：規則機制數值不受版權保護，與既有 `hitDie`/`skillCount` 做法一致；不依賴 2014 內容庫的 `classes` 表（其 caster 數值屬 2014 且藏在 jsonb classTableGroups，解析成本高）。

### D3. 法術清單用既有 `spellCatalogProvider`，以職業英文名過濾
戲法區 `(level: 0, className: cls.en)`、一環區 `(level: 1, className: cls.en)` 各一個 family key；FutureProvider 天然快取，切步驟往返不重打。聖騎士/遊俠在 2014 資料無戲法（cantripsKnown 也是 0），戲法區自然為空即隱藏。

### D4. 選擇時反正規化為 `Character.Spell`，描述壓成純文字
`CatalogSpell → Spell` 映射：`name`/`engName`/`level`/`concentration` 直取；`description` 用 `ftTokenize` 把 `entries` 的字串段落壓成純文字（標記取顯示名，list 項目以換行連接，table 捨棄）；`castingTime`/`range` 以小型 formatter 轉顯示字串（如 `1 action`、`120呎`）；`damage`/`upgrade` 留空。
**理由**：`Character` 自持有法術全文，跑團時不依賴內容庫在線；`Spell.description` 是純 String，不動既有 model 與法術頁。
**捨棄方案**：`Spell` 增加 `entries jsonb` 欄位以保留完整排版——動到核心 model 與既有 UI，等法術頁全面改用渲染器時再一併做（見 Risks）。

### D5. 選擇 UI 沿用技能步驟的 chip 模式 + 可展開描述
兩個區塊（戲法 / 一環法術）各有「已選 x/N」計數；每個法術為一列（名稱＋中英名＋環數/學派徽章），點列展開 `FtEntriesView` 完整描述，勾選框選取，達上限後其餘 disable。觸控目標 ≥ 48dp，Material 3 元件。手機/平板皆為既有建角版型（置中 maxWidth 單欄）——建角流程為線性表單，不採 master-detail，與其餘步驟一致。

### D6. 確認與建立
確認頁新增 SPELLS 區塊列出所選法術；`_buildCharacter()` 帶入 `cantrips`、`spells`（`prepared: true`）、`spellSlots: [SpellSlots(level: 1, total: level1Slots)]`。`spellDc`/`spellAttack` 沿用既有推導（施法屬性調整值 + 熟練加值）。

### D7. 離線降級
法術步驟監看兩個 provider 的 error 狀態：顯示「內容庫離線，可先完成建角、之後再補選法術」提示與重試鈕，「下一步」不被鎖住；跳過時角色法術欄位為空、法術位仍依 `level1Slots` 建立（數值屬本機常數，不依賴內容庫）。

## Risks / Trade-offs

- [2014 法術表與 2024 有出入（缺新法術、部分職業表不同）] → 既定決策接受；D2 的數量常數用 2024 值，清單內容以現有資料為準
- [描述壓純文字損失排版（升環效應、表格）] → v1 接受；後續法術頁導入 `FtEntriesView` 時再改存結構化 entries（D4 捨棄方案）
- [法術清單依賴網路，建角中途斷線] → D7 降級路徑保證流程可完成；provider 快取讓已載入的清單不受影響
- [邪術師法術位機制（短休回復的契約法術位）與一般法術位不同] → v1 以一般 `spellSlots` 表示（total 1），短休回復細節屬既有角色卡功能範圍，不在本次處理
- [`v_spells.classes` 過濾含子職業擴充表（fromClassList 以外）之遺漏] → SUPABASE.md 已知限制（`spell_classes` 不含 variant），對 1 級建角影響極小，接受

## Open Questions

- 無（施法數值於實作時逐職業覆核 2024 PHB）
