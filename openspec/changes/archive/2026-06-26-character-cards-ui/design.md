## Context

承 `character-visual`（英雄卡/分頁/區段已統一）。本變更只動各分頁內的內容元件，使其一致並更精煉。純視覺，不改資料/互動。

## Goals / Non-Goals

**Goals:**
- 內容元件（資訊格、戰鬥數值、屬性盾牌、技能/裝備列）視覺一致於金色/暗黑語言。
- 提升密度與層級清晰度。

**Non-Goals:**
- 英雄卡、分頁列、區段標頭（已完成）。
- 資料模型、互動、編輯功能。
- 真實立繪。

## Decisions

### 1. 屬性盾牌高亮改金色
`AbilityShield` 的高亮（施法屬性）由 `AppColors.primaryDark`（偏紫）改為 **`AppColors.accentGold`**（含描邊、填色、修正值色），與英雄卡/主題一致。

### 2. 戰鬥數值卡片統一
`_StatCards` 四格（Speed/Prof/Perc/DC）：
- 數值改**金色強調**（accentGold），標籤維持 sectionLabel 小字、中文小字維持。
- 每格加一個小 icon（如 speed=directions_run、prof=verified、perc=visibility、dc=auto_awesome），與行動頁卡片語彙一致。
- 卡片樣式維持但確保金色/暗黑一致、間距收斂。

### 3. 基本資訊網格精煉
`_InfoGrid` / `InfoField`：
- 標籤（sectionLabel 小字）/ 值（中文主、英文淡）層級維持但微調間距；分隔線更輕（或以間距取代部分分隔）。
- 密度與行動頁卡片內列一致。

### 4. 屬性頁新增「豁免」區段
- 在 `abilities_tab` 的 ABILITIES 與 SKILLS 之間，加一個 `CollapsibleSection`（title `SAVING THROWS 豁免`）。
- 內容：六項豁免，2 欄精簡列（中文名 + 豁免加值），熟練者以金色標示（與技能列同語彙）。
- 加值：`abilityScores.<x>.modifier + (proficientSave ? proficiencyBonus : 0)`（沿用 Checks 豁免的算法）。
- 定位為靜態參考；與行動頁 Checks 的豁免分頁（互動擲骰）互補，非重複。

### 4b. 修正 EntryCard 外框
`EntryCard` 的 `DecoratedBox`（border 預設背景）外包不透明 `ClipRRect`，導致 1px 外框被蓋住、看起來無框（與 pen 的 AbilityCard 不一致）。改為 `DecorationPosition.foreground`，邊框畫在前景即顯示。屬共用元件，修正後全 app 的 EntryCard（法術/武器/動作）外框一致。

### 5. 技能 / 裝備 / 財富列
- 技能列（abilities_tab `_SkillRow`）：密度收斂、熟練金色標示維持。
- 裝備列、財富幣值：對齊金色/暗黑語言、間距一致。

## Risks / Trade-offs

- **[共用元件影響面]** → `AbilityShield`、`InfoField` 僅角色頁用，調整影響範圍可控。
- **[視覺細節主觀]** → 先以 Pencil mockup 對齊金色強調與密度，再實作。
